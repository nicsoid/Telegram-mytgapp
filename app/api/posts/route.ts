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
  scheduledAt: z.string().datetime().optional(), // For backward compatibility
  scheduledTimes: z.array(z.string().datetime()).min(1), // Multiple scheduled times
  isPaidAd: z.boolean().default(false),
  advertiserId: z.string().optional(),
  // Recurring scheduling
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "custom"]).optional(),
  recurrenceInterval: z.number().int().min(1).optional(), // For custom pattern
  recurrenceEndDate: z.string().datetime().optional().nullable(),
  recurrenceCount: z.number().int().min(1).optional(), // Max occurrences
  // For duplicating
  duplicateFrom: z.string().optional(), // Post ID to duplicate from
})

export async function GET(request: NextRequest) {
  try {
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
        scheduledTimes: {
          orderBy: { scheduledAt: "asc" },
        },
      },
      orderBy: { scheduledAt: "asc" },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch posts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    groupId,
    content,
    mediaUrls,
    scheduledAt, // For backward compatibility
    scheduledTimes, // Array of scheduled times
    isPaidAd,
    advertiserId,
    isRecurring,
    recurrencePattern,
    recurrenceInterval,
    recurrenceEndDate,
    recurrenceCount,
    duplicateFrom,
  } = createPostSchema.parse(body)

  // Use scheduledTimes if provided, otherwise fall back to scheduledAt
  const timesToSchedule = scheduledTimes && scheduledTimes.length > 0 
    ? scheduledTimes 
    : scheduledAt 
      ? [scheduledAt] 
      : []
  
  if (timesToSchedule.length === 0) {
    return NextResponse.json(
      { error: "At least one scheduled time is required" },
      { status: 400 }
    )
  }

  // If duplicating, fetch the original post
  let duplicatePost: any = null
  if (duplicateFrom) {
    duplicatePost = await prisma.telegramPost.findUnique({
      where: { id: duplicateFrom },
      select: {
        content: true,
        mediaUrls: true,
        groupId: true,
      },
    })
    if (!duplicatePost) {
      return NextResponse.json({ error: "Post to duplicate not found" }, { status: 404 })
    }
    // Use duplicate post data if not provided
    if (!content) {
      body.content = duplicatePost.content
    }
    if (!mediaUrls || mediaUrls.length === 0) {
      body.mediaUrls = duplicatePost.mediaUrls
    }
    if (!groupId) {
      body.groupId = duplicatePost.groupId
    }
  }

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
  
  // If posting to another user's group, it must be a paid ad
  // If posting to own group, it can be either own post or paid ad
  let finalIsPaidAd = isPaidAd
  let finalAdvertiserId = advertiserId
  
  if (!isGroupOwner) {
    // User is posting to someone else's group - must be a paid ad
    finalIsPaidAd = true
    finalAdvertiserId = session.user.id // The current user is the advertiser
  }
  
  const isOwnPost = !finalIsPaidAd || !finalAdvertiserId

  // Only group owner can post their own posts (non-paid ads)
  if (isOwnPost && !isGroupOwner) {
    return NextResponse.json({ error: "Only group owner can post to their group" }, { status: 403 })
  }

  if (!group.isVerified) {
    return NextResponse.json(
      { error: "Group must be verified before scheduling posts" },
      { status: 400 }
    )
  }

  // For group owner's own posts, check subscription (required for scheduling)
  // Users can post unlimited posts with credits, but group owner needs subscription to schedule posts
  if (isOwnPost && isGroupOwner) {
    // Use finalIsPaidAd and finalAdvertiserId for consistency
    const user = group.user
    const hasActiveSubscription = user.subscriptions.length > 0 ||
                                  (user.subscriptionStatus === "ACTIVE" &&
                                   user.subscriptionTier !== "FREE" &&
                                   (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date()))

    if (!hasActiveSubscription) {
      return NextResponse.json(
        {
          error: "Group owner must have an active subscription to schedule posts. Please subscribe to continue posting.",
          requiresSubscription: true,
          subscribeUrl: "/app/subscriptions",
        },
        { status: 403 }
      )
    }
  }

  // For paid ads (advertiser posting to someone else's group), check if group owner has subscription
  if (finalIsPaidAd && finalAdvertiserId && !isGroupOwner) {
    const user = group.user
    const hasActiveSubscription = user.subscriptions.length > 0 ||
                                  (user.subscriptionStatus === "ACTIVE" &&
                                   user.subscriptionTier !== "FREE" &&
                                   (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date()))

    if (!hasActiveSubscription) {
      return NextResponse.json(
        {
          error: "This group's owner does not have an active subscription. Posts cannot be scheduled to this group at this time.",
          requiresSubscription: true,
        },
        { status: 403 }
      )
    }
  }

  // If paid ad, verify advertiser and check credits
  // Note: Users can post in their own groups without credits
  let creditsPaid: number | null = null
  if (finalIsPaidAd && finalAdvertiserId && !isGroupOwner) {
    const advertiser = await prisma.user.findUnique({
      where: { id: finalAdvertiserId },
    })

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser not found" }, { status: 404 })
    }

    const price = group.pricePerPost
    
    // Check if advertiser has enough credits
    if (advertiser.credits < price) {
      return NextResponse.json(
        { error: "Advertiser has insufficient credits" },
        { status: 400 }
      )
    }

    // Deduct credits and create transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: finalAdvertiserId },
        data: {
          credits: { decrement: price },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId: finalAdvertiserId,
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
    // Use first scheduled time as primary scheduledAt (for backward compatibility)
    const primaryScheduledAt = new Date(timesToSchedule[0])
    
    // Calculate next occurrence for recurring posts
    let nextOccurrence: Date | null = null
    if (isRecurring && recurrencePattern) {
      const baseDate = primaryScheduledAt
      switch (recurrencePattern) {
        case "daily":
          nextOccurrence = new Date(baseDate)
          nextOccurrence.setDate(nextOccurrence.getDate() + 1)
          break
        case "weekly":
          nextOccurrence = new Date(baseDate)
          nextOccurrence.setDate(nextOccurrence.getDate() + 7)
          break
        case "monthly":
          nextOccurrence = new Date(baseDate)
          nextOccurrence.setMonth(nextOccurrence.getMonth() + 1)
          break
        case "custom":
          if (recurrenceInterval) {
            nextOccurrence = new Date(baseDate)
            nextOccurrence.setDate(nextOccurrence.getDate() + recurrenceInterval)
          }
          break
      }
    }

    // Create the post with multiple scheduled times
    const newPost = await tx.telegramPost.create({
      data: {
        groupId,
        ownerId,
        advertiserId: finalIsPaidAd ? finalAdvertiserId : null,
        content,
        mediaUrls: mediaUrls || [],
        scheduledAt: primaryScheduledAt,
        status: PostStatus.SCHEDULED,
        isPaidAd: finalIsPaidAd,
        creditsPaid,
        isRecurring: isRecurring || false,
        recurrencePattern: recurrencePattern || null,
        recurrenceInterval: recurrenceInterval || null,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        recurrenceCount: recurrenceCount || null,
        nextOccurrence,
        // Create scheduled times for each time slot
        scheduledTimes: {
          create: timesToSchedule.map((timeStr) => ({
            scheduledAt: new Date(timeStr),
            status: PostStatus.SCHEDULED,
          })),
        },
      },
      include: {
        scheduledTimes: true,
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

