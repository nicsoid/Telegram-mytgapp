import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { auth } from "@/lib/auth"
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
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")
  const status = searchParams.get("status")

  const where: any = {
    OR: [
      { ownerId: session.user.id }, // Posts in groups owned by user
      { advertiserId: session.user.id }, // Posts where user is advertiser
    ],
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
          username: true,
          pricePerPost: true,
          isVerified: true,
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
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { groupId, content, mediaUrls, scheduledAt, isPaidAd, advertiserId } =
    createPostSchema.parse(body)

  // Verify group exists and get owner
  // Try with subscription fields first, fallback if migration not applied
  let group: any
  try {
    group = await prisma.telegramGroup.findUnique({
      where: { id: groupId },
      include: {
        user: {
          select: {
            id: true,
            freePostsUsed: true,
            freePostsLimit: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true,
            revenueSharePercent: true,
            subscriptions: {
              where: {
                status: "ACTIVE",
                tier: { not: "FREE" },
              },
            },
          },
        },
      },
    })
  } catch (error: any) {
    // If subscription columns don't exist yet, fetch without them
    if (error?.code === 'P2022' || error?.message?.includes('does not exist')) {
      console.warn('[posts] Subscription columns not yet migrated, fetching without subscription fields')
      group = await prisma.telegramGroup.findUnique({
        where: { id: groupId },
        include: {
          user: {
            select: {
              id: true,
              freePostsUsed: true,
              freePostsLimit: true,
              revenueSharePercent: true,
              subscriptions: {
                where: {
                  status: "ACTIVE",
                  tier: { not: "FREE" },
                },
              },
            },
          },
        },
      })
      // Add default values for subscription fields
      if (group?.user) {
        group.user = {
          ...group.user,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiresAt: null,
        }
      }
    } else {
      throw error
    }
  }

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  // Check if user owns the group or is posting as advertiser
  const isGroupOwner = group.userId === session.user.id
  const isOwnPost = !isPaidAd || !advertiserId

  // Only group owner can post their own posts
  if (isOwnPost && !isGroupOwner) {
    return NextResponse.json({ error: "Only group owner can post to their group" }, { status: 403 })
  }

  if (!group.isVerified) {
    return NextResponse.json(
      { error: "Group must be verified before scheduling posts" },
      { status: 400 }
    )
  }

  // For group owner's own posts, check free posts or subscription
  if (isOwnPost && isGroupOwner) {
    const user = group.user
    const hasFreePosts = user.freePostsUsed < user.freePostsLimit
    const hasActiveSubscription = user.subscriptions.length > 0 || 
                                  (user.subscriptionStatus === "ACTIVE" && 
                                   user.subscriptionTier !== "FREE" &&
                                   (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date()))

    if (!hasFreePosts && !hasActiveSubscription) {
      return NextResponse.json(
        { 
          error: "No free posts remaining. Please subscribe to continue posting.",
          requiresSubscription: true,
          freePostsUsed: user.freePostsUsed,
          freePostsLimit: user.freePostsLimit,
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

      // Group owner earns credits (minus commission)
      const owner = group.user
      const commissionPercent = owner.revenueSharePercent || 0.2 // Default 20%
      const ownerEarnings = Math.floor(price * (1 - commissionPercent))
      const commission = price - ownerEarnings

      await tx.user.update({
        where: { id: owner.id },
        data: {
          credits: { increment: ownerEarnings },
          totalEarnings: { increment: ownerEarnings },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId: owner.id,
          amount: ownerEarnings,
          type: "EARNED",
          relatedPostId: null,
          relatedGroupId: groupId,
          description: `Earnings from paid ad in ${group.name}`,
        },
      })

      // Platform commission
      if (commission > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: owner.id, // Track commission against owner for reporting
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
          totalRevenue: { increment: ownerEarnings },
        },
      })

      creditsPaid = price
    })
  }

  // Create post and update free posts counter if it's a free post
  const post = await prisma.$transaction(async (tx) => {
    const ownerId = group.userId
    const newPost = await tx.telegramPost.create({
      data: {
        groupId,
        ownerId,
        advertiserId: isPaidAd ? advertiserId : null,
        content,
        mediaUrls: mediaUrls || [],
        scheduledAt: new Date(scheduledAt),
        status: PostStatus.SCHEDULED,
        isPaidAd,
        creditsPaid,
      },
    })

    // If it's owner's own post and they have free posts, increment counter
    if (isOwnPost && isGroupOwner) {
      const owner = await tx.user.findUnique({
        where: { id: ownerId },
      })

      if (owner && owner.freePostsUsed < owner.freePostsLimit) {
        await tx.user.update({
          where: { id: ownerId },
          data: {
            freePostsUsed: { increment: 1 },
          },
        })

        // Create transaction record for free post
        await tx.creditTransaction.create({
          data: {
            userId: ownerId,
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

