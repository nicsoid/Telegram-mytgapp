import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PostStatus } from "@prisma/client"

const createPostSchema = z.object({
  groupId: z.string(),
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional().default([]),
  scheduledAt: z.string().datetime(),
  isPaidAd: z.boolean().default(false),
  advertiserId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")
  const status = searchParams.get("status")

  const where: any = {
    publisherId: guard.publisher.id,
  }

  if (groupId) {
    where.groupId = groupId
  }

  if (status) {
    where.status = status
  }

  const posts = await prisma.telegramPost.findMany({
    where,
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      advertiser: {
        select: {
          id: true,
          name: true,
          telegramUsername: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  })

  return NextResponse.json({ posts })
}

export async function POST(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const body = await request.json()
  const { groupId, content, mediaUrls, scheduledAt, isPaidAd, advertiserId } =
    createPostSchema.parse(body)

  // Verify group belongs to publisher
  const group = await prisma.telegramGroup.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  if (group.publisherId !== guard.publisher.id) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  if (!group.isVerified) {
    return NextResponse.json(
      { error: "Group must be verified before scheduling posts" },
      { status: 400 }
    )
  }

  // Check if this is publisher's own post (not a paid ad)
  const isOwnPost = !isPaidAd || !advertiserId

  // For publisher's own posts, check free posts or subscription
  if (isOwnPost) {
    const publisher = await prisma.publisher.findUnique({
      where: { id: guard.publisher.id },
      select: {
        id: true,
        freePostsUsed: true,
        freePostsLimit: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
        },
      },
    })

    if (!publisher) {
      return NextResponse.json({ error: "Publisher not found" }, { status: 404 })
    }

    // Check if publisher has free posts available
    const hasFreePosts = publisher.freePostsUsed < publisher.freePostsLimit
    const hasActiveSubscription = publisher.subscriptions.length > 0 || 
                                  (publisher.subscriptionStatus === "ACTIVE" && 
                                   publisher.subscriptionTier !== "FREE" &&
                                   (!publisher.subscriptionExpiresAt || publisher.subscriptionExpiresAt > new Date()))

    if (!hasFreePosts && !hasActiveSubscription) {
      return NextResponse.json(
        { 
          error: "No free posts remaining. Please subscribe to continue posting.",
          requiresSubscription: true,
          freePostsUsed: publisher.freePostsUsed,
          freePostsLimit: publisher.freePostsLimit,
        },
        { status: 403 }
      )
    }
  }

  // If paid ad, verify advertiser and check credits
  let creditsPaid: number | null = null
  if (isPaidAd && advertiserId) {
    const advertiser = await prisma.user.findUnique({
      where: { id: advertiserId },
    })

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser not found" }, { status: 404 })
    }

    const price = group.pricePerPost
    if (advertiser.credits < price) {
      return NextResponse.json(
        { error: "Advertiser has insufficient credits" },
        { status: 400 }
      )
    }

    // Deduct credits and create transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: advertiserId },
        data: {
          credits: { decrement: price },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId: advertiserId,
          amount: -price,
          type: "SPENT",
          relatedPostId: null, // Will update after post creation
          relatedGroupId: groupId,
          description: `Paid ad in group: ${group.name}`,
        },
      })

      // Publisher earns credits (minus commission)
      const commissionPercent = guard.publisher.revenueSharePercent || 0.2 // Default 20%
      const publisherEarnings = Math.floor(price * (1 - commissionPercent))
      const commission = price - publisherEarnings

      await tx.user.update({
        where: { id: guard.publisher.userId },
        data: {
          credits: { increment: publisherEarnings },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId: guard.publisher.userId,
          amount: publisherEarnings,
          type: "EARNED",
          relatedPostId: null,
          relatedGroupId: groupId,
          description: `Earnings from paid ad in ${group.name}`,
        },
      })

      // Platform commission
      if (commission > 0) {
        // Could create a system user or just track in transactions
        await tx.creditTransaction.create({
          data: {
            userId: guard.publisher.userId, // Track commission against publisher for reporting
            amount: -commission,
            type: "COMMISSION",
            relatedPostId: null,
            relatedGroupId: groupId,
            description: `Platform commission (${(commissionPercent * 100).toFixed(0)}%)`,
          },
        })
      }

      await tx.telegramGroup.update({
        where: { id: groupId },
        data: {
          totalRevenue: { increment: publisherEarnings },
        },
      })

      await tx.publisher.update({
        where: { id: guard.publisher.id },
        data: {
          totalEarnings: { increment: publisherEarnings },
        },
      })

      creditsPaid = price
    })
  }

  // Create post and update free posts counter if it's a free post
  const post = await prisma.$transaction(async (tx) => {
    const newPost = await tx.telegramPost.create({
      data: {
        groupId,
        publisherId: guard.publisher.id,
        advertiserId: isPaidAd ? advertiserId : null,
        content,
        mediaUrls: mediaUrls || [],
        scheduledAt: new Date(scheduledAt),
        status: PostStatus.SCHEDULED,
        isPaidAd,
        creditsPaid,
      },
    })

    // If it's publisher's own post and they have free posts, increment counter
    if (isOwnPost) {
      const publisher = await tx.publisher.findUnique({
        where: { id: guard.publisher.id },
      })

      if (publisher && publisher.freePostsUsed < publisher.freePostsLimit) {
        await tx.publisher.update({
          where: { id: guard.publisher.id },
          data: {
            freePostsUsed: { increment: 1 },
          },
        })

        // Create transaction record for free post
        await tx.creditTransaction.create({
          data: {
            userId: guard.publisher.userId,
            amount: 0,
            type: "FREE_POST",
            relatedPostId: newPost.id,
            relatedGroupId: groupId,
            description: `Free post in ${group.name}`,
          },
        })
      }
    }

    // Update group stats
    await tx.telegramGroup.update({
      where: { id: groupId },
      data: {
        totalPostsScheduled: { increment: 1 },
      },
    })

    return newPost
  })

  return NextResponse.json({
    success: true,
    post,
  })
}

