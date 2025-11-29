import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const requestStickyPostSchema = z.object({
  groupId: z.string(),
  postId: z.string().optional(), // Optional: if post already exists
  content: z.string().optional(), // Required if postId not provided
  mediaUrls: z.array(z.string()).optional().default([]),
  periodDays: z.number().int().min(1).max(365),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { groupId, postId, content, mediaUrls, periodDays } = requestStickyPostSchema.parse(body)

    // Verify group exists and has sticky posts enabled
    const group = await prisma.telegramGroup.findUnique({
      where: { id: groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (!group.stickyPostsEnabled) {
      return NextResponse.json(
        { error: "Sticky posts are not enabled for this group" },
        { status: 400 }
      )
    }

    if (!group.stickyPostPrice) {
      return NextResponse.json(
        { error: "Sticky post price is not set for this group" },
        { status: 400 }
      )
    }

    // Calculate total cost (price per day * period)
    const totalCost = group.stickyPostPrice * periodDays

    // Check if post exists (if postId provided)
    if (postId) {
      const post = await prisma.telegramPost.findUnique({
        where: { id: postId },
        select: { id: true, ownerId: true, advertiserId: true },
      })

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      }

      // Verify user owns the post or is the advertiser
      if (post.ownerId !== session.user.id && post.advertiserId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    } else {
      // If no postId, content is required
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { error: "Content is required when creating a new post" },
          { status: 400 }
        )
      }
    }

    // Check user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    })

    if (!user || user.credits < totalCost) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${totalCost} credits for ${periodDays} day(s) of sticky post.`,
          requiredCredits: totalCost,
          currentCredits: user?.credits || 0,
        },
        { status: 400 }
      )
    }

    // Create sticky post request and deduct credits
    const stickyRequest = await prisma.$transaction(async (tx) => {
      // Deduct credits
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          credits: { decrement: totalCost },
        },
      })

      // Create credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -totalCost,
          type: "SPENT",
          relatedGroupId: groupId,
          description: `Sticky post request for ${periodDays} day(s) in group: ${group.name}`,
        },
      })

      // Create sticky post request
      const request = await tx.stickyPostRequest.create({
        data: {
          userId: session.user.id,
          groupId,
          groupOwnerId: group.userId,
          postId: postId || null,
          content: content || null,
          mediaUrls: mediaUrls || [],
          periodDays,
          creditsPaid: totalCost,
          status: "PENDING",
        },
      })

      return request
    })

    return NextResponse.json({
      success: true,
      request: stickyRequest,
      message: "Sticky post request submitted successfully",
    })
  } catch (error) {
    console.error("Error creating sticky post request:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create sticky post request" },
      { status: 500 }
    )
  }
}

