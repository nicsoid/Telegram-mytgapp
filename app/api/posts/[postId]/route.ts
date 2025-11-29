import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PostStatus } from "@prisma/client"

const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
  scheduledTimes: z.array(z.string().datetime()).optional(),
  status: z.nativeEnum(PostStatus).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId } = await params

    const post = await prisma.telegramPost.findUnique({
      where: { id: postId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            username: true,
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
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Verify user has access (owner or advertiser)
    if (post.ownerId !== session.user.id && post.advertiserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error("Error fetching post:", error)
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId } = await params
    const body = await request.json()
    const data = updatePostSchema.parse(body)

    // Verify post exists and user has access - get full post details for credit checks
    const post = await prisma.telegramPost.findUnique({
      where: { id: postId },
      include: {
        group: {
          include: {
            user: {
              select: {
                id: true,
                subscriptionTier: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true,
                subscriptions: {
                  where: {
                    status: "ACTIVE",
                    tier: { not: "FREE" },
                  },
                  select: { id: true },
                },
              },
            },
          },
        },
        scheduledTimes: {
          where: {
            status: PostStatus.SCHEDULED,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Only owner or advertiser can edit
    if (post.ownerId !== session.user.id && post.advertiserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Allow editing even if post status is SENT - user can add new scheduled times
    // We'll update status back to SCHEDULED if new times are added

    // Build update data
    const updateData: any = {}
    if (data.content !== undefined) updateData.content = data.content
    if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(data.scheduledAt)
    }
    if (data.status !== undefined) updateData.status = data.status

    // Handle scheduledTimes update
    let scheduledTimesToCreate: { scheduledAt: Date }[] | null = null
    let shouldUpdateStatusToScheduled = false
    
    if (data.scheduledTimes !== undefined && Array.isArray(data.scheduledTimes)) {
      // Count existing SCHEDULED times
      const existingScheduledCount = post.scheduledTimes?.length || 0
      const newScheduledCount = data.scheduledTimes.length
      
      // If adding new scheduled times (more than existing), check credits for paid ads
      if (newScheduledCount > existingScheduledCount && post.isPaidAd && post.advertiserId) {
        const advertiserId = post.advertiserId // Store in variable for TypeScript
        const additionalTimes = newScheduledCount - existingScheduledCount
        const pricePerPost = post.group.pricePerPost || 0
        const totalCreditsNeeded = additionalTimes * pricePerPost
        
        // Check advertiser has enough credits
        const advertiser = await prisma.user.findUnique({
          where: { id: advertiserId },
          select: { credits: true },
        })
        
        if (!advertiser || advertiser.credits < totalCreditsNeeded) {
          return NextResponse.json(
            { error: `Insufficient credits. Need ${totalCreditsNeeded} credits for ${additionalTimes} additional scheduled time(s).` },
            { status: 400 }
          )
        }
        
        // Deduct credits for additional scheduled times
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: advertiserId },
            data: {
              credits: { decrement: totalCreditsNeeded },
            },
          })
          
          await tx.creditTransaction.create({
            data: {
              userId: advertiserId,
              amount: -totalCreditsNeeded,
              type: "SPENT",
              relatedPostId: postId,
              relatedGroupId: post.groupId,
              description: `Additional scheduled times for paid ad in group: ${post.group.name}`,
            },
          })
          
          // Group owner earns credits (minus commission)
          const owner = post.group.user
          const commissionPercent = 0.2 // Default 20% commission
          const ownerEarnings = Math.floor(totalCreditsNeeded * (1 - commissionPercent))
          const commission = totalCreditsNeeded - ownerEarnings
          
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
              relatedPostId: postId,
              relatedGroupId: post.groupId,
              description: `Earnings from additional scheduled times in ${post.group.name}`,
            },
          })
          
          // Update group revenue
          await tx.telegramGroup.update({
            where: { id: post.groupId },
            data: {
              totalRevenue: { increment: ownerEarnings },
            },
          })
        })
      }
      
      // Check subscription requirement for group owner's own posts
      if (!post.isPaidAd || !post.advertiserId) {
        // This is the group owner's own post
        const owner = post.group.user
        const hasActiveSubscription = owner.subscriptions.length > 0 ||
                                      (owner.subscriptionStatus === "ACTIVE" &&
                                       owner.subscriptionTier !== "FREE" &&
                                       (!owner.subscriptionExpiresAt || new Date(owner.subscriptionExpiresAt) > new Date()))
        
        if (!hasActiveSubscription && newScheduledCount > 0) {
          return NextResponse.json(
            {
              error: "Group owner must have an active subscription to schedule posts. Please subscribe to continue posting.",
              requiresSubscription: true,
              subscribeUrl: "/app/subscriptions",
            },
            { status: 403 }
          )
        }
      } else {
        // For paid ads, check if group owner has subscription
        const owner = post.group.user
        const hasActiveSubscription = owner.subscriptions.length > 0 ||
                                      (owner.subscriptionStatus === "ACTIVE" &&
                                       owner.subscriptionTier !== "FREE" &&
                                       (!owner.subscriptionExpiresAt || new Date(owner.subscriptionExpiresAt) > new Date()))
        
        if (!hasActiveSubscription && newScheduledCount > 0) {
          return NextResponse.json(
            {
              error: "This group's owner does not have an active subscription. Posts cannot be scheduled to this group at this time.",
              requiresSubscription: true,
            },
            { status: 403 }
          )
        }
      }
      
      // Only delete existing SCHEDULED times (keep SENT ones for stats)
      await prisma.scheduledPostTime.deleteMany({
        where: {
          postId: postId,
          status: PostStatus.SCHEDULED,
        },
      })

      // Create new scheduled times
      if (data.scheduledTimes.length > 0) {
        scheduledTimesToCreate = data.scheduledTimes.map((time) => ({
          scheduledAt: new Date(time),
        }))
        // If adding new scheduled times, update post status to SCHEDULED
        shouldUpdateStatusToScheduled = true
      }
    }
    
    // Update post status to SCHEDULED if new times were added
    if (shouldUpdateStatusToScheduled) {
      updateData.status = PostStatus.SCHEDULED
    }

    const updatedPost = await prisma.telegramPost.update({
      where: { id: postId },
      data: {
        ...updateData,
        ...(scheduledTimesToCreate && {
          scheduledTimes: {
            create: scheduledTimesToCreate,
          },
        }),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        scheduledTimes: {
          orderBy: { scheduledAt: "asc" },
        },
      },
    })

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error("Error updating post:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId } = await params

    // Verify post exists and user has access
    const post = await prisma.telegramPost.findUnique({
      where: { id: postId },
      select: {
        ownerId: true,
        advertiserId: true,
        status: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Only owner or advertiser can delete
    if (post.ownerId !== session.user.id && post.advertiserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the post - this will cascade delete all scheduled times
    // Past times are kept in stats, but when post is deleted, all times are deleted
    await prisma.telegramPost.delete({
      where: { id: postId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    )
  }
}

