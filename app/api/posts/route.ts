import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PostStatus } from "@prisma/client"

const scheduledTimeSchema = z.object({
  time: z.string().datetime(),
  isFree: z.boolean().default(false),
})

const createPostSchema = z.object({
  groupId: z.string(),
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional().default([]),
  scheduledAt: z.string().datetime().optional(), // For backward compatibility
  scheduledTimes: z.array(scheduledTimeSchema).min(1), // Multiple scheduled times with free flag
  isPaidAd: z.boolean().optional().default(false), // Deprecated, kept for backward compatibility
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
    ? scheduledTimes.map((st) => ({ time: st.time, isFree: st.isFree || false }))
    : scheduledAt 
      ? [{ time: scheduledAt, isFree: false }]
      : []
  
  if (timesToSchedule.length === 0) {
    return NextResponse.json(
      { error: "At least one scheduled time is required" },
      { status: 400 }
    )
  }

  // Validate that all scheduled times are in the future
  const now = new Date()
  const pastTimes = timesToSchedule.filter((st) => new Date(st.time) <= now)
  if (pastTimes.length > 0) {
    return NextResponse.json(
      { error: "Cannot schedule posts in the past. Please select future dates and times." },
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
  
  // Determine if this is a paid ad
  // If posting to another user's group:
  //   - If group is free (pricePerPost === 0), it's not a paid ad
  //   - If group is paid (pricePerPost > 0) and no times marked as free, it's a paid ad
  //   - If group is paid and some times marked as free, only non-free times are paid
  // If posting to own group, it's not a paid ad
  let finalIsPaidAd = false
  let finalAdvertiserId: string | null = null
  
  if (!isGroupOwner) {
    const isFreeGroup = group.pricePerPost === 0
    
    if (!isFreeGroup) {
      // Paid group - check if any scheduled time is marked as free
      const hasFreeTimes = timesToSchedule.some(st => st.isFree)
      const hasPaidTimes = timesToSchedule.some(st => !st.isFree)
      
      if (hasPaidTimes) {
        // Has paid times, so this is a paid ad
        finalIsPaidAd = true
        finalAdvertiserId = session.user.id // The current user is the advertiser
      }
    }
    // If free group, no paid ad (all posts are free)
  }
  
  const isOwnPost = isGroupOwner

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

  // Check if this is a free group (pricePerPost === 0)
  const isFreeGroup = group.pricePerPost === 0
  const freePostIntervalDays = group.freePostIntervalDays || 0
  
  // Initialize creditsPaid
  let creditsPaid: number | null = null
  
  // For free groups (pricePerPost === 0), all posts are free, but check quiet period if interval > 0
  if (isFreeGroup && !isGroupOwner && freePostIntervalDays > 0) {
    // Find the most recent post by this advertiser in this group
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
    
    if (lastPost) {
      // Get the most recent scheduled time (either from scheduledTimes or scheduledAt)
      const lastScheduledTime = lastPost.scheduledTimes?.[0]?.scheduledAt 
        ? new Date(lastPost.scheduledTimes[0].scheduledAt)
        : new Date(lastPost.scheduledAt)
      
      // Get the earliest scheduled time from the new post
      const earliestNewTime = new Date(Math.min(...timesToSchedule.map(st => new Date(st.time).getTime())))
      
      // Calculate days between last post and new post
      const daysSinceLastPost = (earliestNewTime.getTime() - lastScheduledTime.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceLastPost < freePostIntervalDays) {
        const daysRemaining = Math.ceil(freePostIntervalDays - daysSinceLastPost)
        return NextResponse.json(
          { 
            error: `Quiet period not met. You can post again in ${daysRemaining} day(s). This group requires ${freePostIntervalDays} days between posts.`,
            quietPeriodDays: freePostIntervalDays,
            daysRemaining,
          },
          { status: 400 }
        )
      }
    }
    
    // For free groups, no credits needed
    creditsPaid = 0
  }
  
  // For paid groups (pricePerPost > 0), check free post eligibility for scheduled times marked as free
  if (!isFreeGroup && !isGroupOwner && freePostIntervalDays > 0) {
    const freeTimes = timesToSchedule.filter(st => st.isFree)
    
    if (freeTimes.length > 0) {
      // Check if user can use free post
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
      
      if (lastFreePost) {
        const daysSinceLastFreePost = (new Date().getTime() - new Date(lastFreePost.scheduledAt).getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysSinceLastFreePost < freePostIntervalDays) {
          const daysRemaining = Math.ceil(freePostIntervalDays - daysSinceLastFreePost)
          return NextResponse.json(
            {
              error: `You can schedule a free post once per ${freePostIntervalDays} days. Your next free post will be available in ${daysRemaining} day(s).`,
              daysRemaining,
              freePostIntervalDays,
            },
            { status: 400 }
          )
        }
      }
      
      // Only allow one free post per period
      if (freeTimes.length > 1) {
        return NextResponse.json(
          {
            error: `You can only schedule one free post per ${freePostIntervalDays} days. Please mark only one scheduled time as free.`,
          },
          { status: 400 }
        )
      }
    }
  }
  
  // If paid ad, verify advertiser and check credits
  // Note: Users can post in their own groups without credits
  // For free groups, creditsPaid is already set to 0 above
  
  // For paid groups, check credits for non-free scheduled times
  if (!isFreeGroup && finalIsPaidAd && finalAdvertiserId && !isGroupOwner) {
    // If paid ad (non-free group), verify advertiser and check credits
    // Count how many paid times (non-free) we have
    const paidTimes = timesToSchedule.filter(st => !st.isFree)
    
    if (paidTimes.length > 0) {
      const advertiser = await prisma.user.findUnique({
        where: { id: finalAdvertiserId },
      })

      if (!advertiser) {
        return NextResponse.json({ error: "Advertiser not found" }, { status: 404 })
      }

      const price = group.pricePerPost
      const totalPrice = price * paidTimes.length
      
      // Check if advertiser has enough credits
      if (advertiser.credits < totalPrice) {
        return NextResponse.json(
          { error: `Advertiser has insufficient credits. Need ${totalPrice} credits for ${paidTimes.length} paid post(s).` },
          { status: 400 }
        )
      }

      // Deduct credits and create transaction
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: finalAdvertiserId },
          data: {
            credits: { decrement: totalPrice },
          },
        })

        await tx.creditTransaction.create({
          data: {
            userId: finalAdvertiserId,
            amount: -totalPrice,
            type: "SPENT",
            relatedPostId: null, // Will update after post creation
            relatedGroupId: groupId,
            description: `Paid ad in group: ${group.name} (${paidTimes.length} post(s))`,
          },
        })

        // Group owner earns credits (minus commission)
        const owner = group.user
        const commissionPercent = owner.revenueSharePercent || 0.2 // Default 20%
        const ownerEarnings = Math.floor(totalPrice * (1 - commissionPercent))
        const commission = totalPrice - ownerEarnings

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

        creditsPaid = totalPrice
      })
    }
  }

  // Create post and update free posts counter if it's a free post
  const post = await prisma.$transaction(async (tx) => {
    const ownerId = group.userId
    // Use first scheduled time as primary scheduledAt (for backward compatibility)
    const primaryScheduledAt = new Date(timesToSchedule[0].time)
    
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
        // For free groups, all posts are free. For paid groups, use the isFree flag.
        scheduledTimes: {
          create: timesToSchedule.map((st) => ({
            scheduledAt: new Date(st.time),
            status: PostStatus.SCHEDULED,
            isFreePost: isFreeGroup ? true : st.isFree, // Free groups are always free
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

