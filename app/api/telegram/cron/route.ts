import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"
import { PostStatus } from "@prisma/client"

/**
 * Cron job to send scheduled Telegram posts
 * Should be called periodically (e.g., every minute) via cron service
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    // Find posts scheduled to be sent in the next 5 minutes
    const postsToSend = await prisma.telegramPost.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: {
          gte: now,
          lte: fiveMinutesFromNow,
        },
      },
      include: {
        group: {
          select: {
            telegramChatId: true,
            name: true,
          },
        },
      },
    })

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const post of postsToSend) {
      try {
        // Send post to Telegram
        await sendTelegramMessage(post.group.telegramChatId, post.content, {
          parseMode: "HTML",
        })

        // Update post status
        await prisma.telegramPost.update({
          where: { id: post.id },
          data: {
            status: PostStatus.SENT,
            postedAt: new Date(),
          },
        })

        // Update group stats
        await prisma.telegramGroup.update({
          where: { id: post.groupId },
          data: {
            totalPostsSent: { increment: 1 },
          },
        })

        results.sent++
      } catch (error: any) {
        console.error(`Failed to send post ${post.id}:`, error)

        // Update post status to failed
        await prisma.telegramPost.update({
          where: { id: post.id },
          data: {
            status: PostStatus.FAILED,
            failureReason: error.message || "Unknown error",
          },
        })

        results.failed++
        results.errors.push(`Post ${post.id}: ${error.message}`)
      }

      results.processed++
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} posts: ${results.sent} sent, ${results.failed} failed`,
      results,
    })
  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json(
      { error: "Failed to process posts", details: (error as Error).message },
      { status: 500 }
    )
  }
}

