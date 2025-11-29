import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  // Get group info
  const group = await prisma.telegramGroup.findUnique({
    where: { id: groupId },
    select: {
      freePostIntervalDays: true,
      pricePerPost: true,
      userId: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const isGroupOwner = group.userId === session.user.id
  const freePostIntervalDays = group.freePostIntervalDays || 0
  const isFreeGroup = group.pricePerPost === 0

  // Group owners can always post for free (no interval check)
  if (isGroupOwner) {
    return NextResponse.json({
      canUseFree: true,
      daysRemaining: null,
      lastFreePostDate: null,
      freePostIntervalDays,
      isFreeGroup,
    })
  }

  // For free groups (pricePerPost === 0), all posts are free, but quiet period applies if interval > 0
  if (isFreeGroup) {
    if (freePostIntervalDays === 0) {
      // No quiet period, can always post
      return NextResponse.json({
        canUseFree: true,
        daysRemaining: null,
        lastFreePostDate: null,
        freePostIntervalDays: 0,
        isFreeGroup: true,
      })
    }
    
    // Check quiet period - find last post (not just free post, any post)
    const lastPost = await prisma.telegramPost.findFirst({
      where: {
        groupId: groupId,
        advertiserId: session.user.id,
        status: { in: ["SCHEDULED", "SENT"] },
      },
      orderBy: {
        scheduledAt: "desc",
      },
      include: {
        scheduledTimes: {
          orderBy: {
            scheduledAt: "desc",
          },
          take: 1,
        },
      },
    })
    
    if (!lastPost) {
      return NextResponse.json({
        canUseFree: true,
        daysRemaining: null,
        lastFreePostDate: null,
        freePostIntervalDays,
        isFreeGroup: true,
      })
    }
    
    const lastScheduledTime = lastPost.scheduledTimes?.[0]?.scheduledAt 
      ? new Date(lastPost.scheduledTimes[0].scheduledAt)
      : new Date(lastPost.scheduledAt)
    
    const daysSinceLastPost = (new Date().getTime() - lastScheduledTime.getTime()) / (1000 * 60 * 60 * 24)
    const canUseFree = daysSinceLastPost >= freePostIntervalDays
    const daysRemaining = canUseFree ? null : Math.ceil(freePostIntervalDays - daysSinceLastPost)
    
    return NextResponse.json({
      canUseFree,
      daysRemaining,
      lastFreePostDate: lastScheduledTime.toISOString(),
      freePostIntervalDays,
      isFreeGroup: true,
    })
  }

  // For paid groups, check free post eligibility (one free post per period)
  // If freePostIntervalDays is 0, users can't post for free
  if (freePostIntervalDays === 0) {
    return NextResponse.json({
      canUseFree: false,
      daysRemaining: null,
      lastFreePostDate: null,
      freePostIntervalDays: 0,
      isFreeGroup: false,
    })
  }

  // Find the last free post by this user in this group
  const lastFreePost = await prisma.scheduledPostTime.findFirst({
    where: {
      post: {
        groupId: groupId,
        advertiserId: session.user.id,
      },
      isFreePost: true,
      status: { in: ["SCHEDULED", "SENT"] },
    },
    orderBy: {
      scheduledAt: "desc",
    },
  })

  if (!lastFreePost) {
    // No previous free post, user can use free post
    return NextResponse.json({
      canUseFree: true,
      daysRemaining: null,
      lastFreePostDate: null,
      freePostIntervalDays,
    })
  }

  // Calculate days since last free post
  const daysSinceLastFreePost = (new Date().getTime() - new Date(lastFreePost.scheduledAt).getTime()) / (1000 * 60 * 60 * 24)
  const canUseFree = daysSinceLastFreePost >= freePostIntervalDays
  const daysRemaining = canUseFree ? null : Math.ceil(freePostIntervalDays - daysSinceLastFreePost)

  return NextResponse.json({
    canUseFree,
    daysRemaining,
    lastFreePostDate: lastFreePost.scheduledAt.toISOString(),
    freePostIntervalDays,
    isFreeGroup: false,
  })
}

