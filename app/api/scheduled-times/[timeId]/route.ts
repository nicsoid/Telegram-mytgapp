import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Delete a specific scheduled time (only future times can be deleted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ timeId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { timeId } = await params

    // Get the scheduled time with post info
    const scheduledTime = await prisma.scheduledPostTime.findUnique({
      where: { id: timeId },
      include: {
        post: {
          select: {
            id: true,
            ownerId: true,
            advertiserId: true,
          },
        },
      },
    })

    if (!scheduledTime) {
      return NextResponse.json({ error: "Scheduled time not found" }, { status: 404 })
    }

    // Verify user has access (owner or advertiser)
    if (
      scheduledTime.post.ownerId !== session.user.id &&
      scheduledTime.post.advertiserId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Only allow deletion of future scheduled times (past times are kept for stats)
    const now = new Date()
    if (scheduledTime.scheduledAt <= now) {
      return NextResponse.json(
        { error: "Cannot delete past scheduled times. They are kept for statistics." },
        { status: 400 }
      )
    }

    // Only allow deletion of SCHEDULED times (not SENT or FAILED)
    if (scheduledTime.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only delete scheduled times that haven't been sent yet" },
        { status: 400 }
      )
    }

    // Delete the scheduled time
    await prisma.scheduledPostTime.delete({
      where: { id: timeId },
    })

    // Check if there are any remaining scheduled times for this post
    const remainingCount = await prisma.scheduledPostTime.count({
      where: {
        postId: scheduledTime.post.id,
        status: "SCHEDULED",
      },
    })

    // If no more scheduled times, update post status
    if (remainingCount === 0) {
      await prisma.telegramPost.update({
        where: { id: scheduledTime.post.id },
        data: {
          status: "DRAFT", // Or keep as SCHEDULED if there are past times?
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting scheduled time:", error)
    return NextResponse.json(
      { error: "Failed to delete scheduled time" },
      { status: 500 }
    )
  }
}

