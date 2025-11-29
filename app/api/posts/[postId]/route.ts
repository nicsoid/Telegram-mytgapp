import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PostStatus } from "@prisma/client"

const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
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

    // Verify post exists and user has access
    const post = await prisma.telegramPost.findUnique({
      where: { id: postId },
      select: {
        ownerId: true,
        advertiserId: true,
        status: true,
        groupId: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Only owner or advertiser can edit
    if (post.ownerId !== session.user.id && post.advertiserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Can't edit sent posts
    if (post.status === "SENT") {
      return NextResponse.json(
        { error: "Cannot edit sent posts" },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (data.content !== undefined) updateData.content = data.content
    if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(data.scheduledAt)
    }
    if (data.status !== undefined) updateData.status = data.status

    const updatedPost = await prisma.telegramPost.update({
      where: { id: postId },
      data: updateData,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            username: true,
          },
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

