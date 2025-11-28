import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramVideo,
  sendTelegramMediaGroup,
} from "@/lib/telegram"
import { PostStatus } from "@prisma/client"
import { convertRichTextToTelegram, stripRichTextTags } from "@/lib/richText"

/**
 * Cron job to send scheduled Telegram posts
 * Should be called periodically (e.g., every minute) via cron service
 */
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp"]
const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm", "m4v"]

function getMediaType(url: string): "video" | "photo" {
  const cleanUrl = url.split("?")[0]
  const ext = cleanUrl.split(".").pop()?.toLowerCase() || ""
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return "video"
  }
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return "photo"
  }
  return "photo"
}

function prepareCaption(content: string, limit = 1024) {
  if (!content) return ""
  if (content.length <= limit) return content
  const plain = stripRichTextTags(content).slice(0, limit - 3)
  return `${plain}...`
}

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
        const captionHtml = convertRichTextToTelegram(post.content || "")
        const chatId = post.group.telegramChatId
        const mediaUrls = post.mediaUrls || []

        // Skip posts for groups without chat ID (not verified yet)
        if (!chatId) {
          results.errors.push(`Post ${post.id}: Group ${post.group.name} is not verified (no chat ID)`)
          continue
        }

        if (!mediaUrls.length) {
          await sendTelegramMessage(chatId, captionHtml, {
            parseMode: "HTML",
          })
        } else if (mediaUrls.length === 1) {
          const mediaUrl = mediaUrls[0]
          const type = getMediaType(mediaUrl)
          const caption = prepareCaption(captionHtml)
          if (type === "video") {
            await sendTelegramVideo(chatId, mediaUrl, {
              caption,
              parseMode: "HTML",
            })
          } else {
            await sendTelegramPhoto(chatId, mediaUrl, {
              caption,
              parseMode: "HTML",
            })
          }
        } else {
          const caption = prepareCaption(captionHtml)
          const mediaItems = mediaUrls.slice(0, 10).map((url, index) => ({
            type: getMediaType(url),
            media: url,
            caption: index === 0 ? caption : undefined,
            parse_mode: index === 0 ? ("HTML" as const) : undefined,
          }))
          await sendTelegramMediaGroup(chatId, mediaItems)
        }

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

