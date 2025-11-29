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

    // Find scheduled times that need to be sent:
    // 1. Past due posts (scheduled in the past but not yet sent)
    // 2. Posts scheduled in the next 5 minutes
    const scheduledTimesToSend = await prisma.scheduledPostTime.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        OR: [
          // Past due posts (should have been sent already)
          {
            scheduledAt: {
              lt: now,
            },
          },
          // Posts scheduled in the next 5 minutes
          {
            scheduledAt: {
              gte: now,
              lte: fiveMinutesFromNow,
            },
          },
        ],
      },
      include: {
        post: {
          include: {
            group: {
              select: {
                telegramChatId: true,
                name: true,
                userId: true,
              },
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

    for (const scheduledTime of scheduledTimesToSend) {
      const post = scheduledTime.post
      try {
        const captionHtml = convertRichTextToTelegram(post.content || "")
        const chatId = post.group.telegramChatId
        const mediaUrls = post.mediaUrls || []
        const groupOwner = post.group.user

        // Skip posts for groups without chat ID (not verified yet)
        if (!chatId) {
          results.errors.push(`Post ${post.id}: Group ${post.group.name} is not verified (no chat ID)`)
          await prisma.scheduledPostTime.update({
            where: { id: scheduledTime.id },
            data: { status: PostStatus.FAILED, failureReason: "Group not verified" },
          })
          continue
        }

        // Check if group owner has active subscription (required for posts to be sent)
        const hasActiveSubscription = groupOwner.subscriptions.length > 0 ||
                                      (groupOwner.subscriptionStatus === "ACTIVE" &&
                                       groupOwner.subscriptionTier !== "FREE" &&
                                       (!groupOwner.subscriptionExpiresAt || new Date(groupOwner.subscriptionExpiresAt) > new Date()))

        if (!hasActiveSubscription) {
          results.errors.push(`Post ${post.id}: Group owner ${post.group.name} does not have active subscription`)
          await prisma.scheduledPostTime.update({
            where: { id: scheduledTime.id },
            data: { status: PostStatus.FAILED, failureReason: "Group owner subscription required" },
          })
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

        // Update the scheduled time as sent
        await prisma.scheduledPostTime.update({
          where: { id: scheduledTime.id },
          data: {
            status: PostStatus.SENT,
            postedAt: new Date(),
          },
        })

        // Update post status if all scheduled times are sent
        const remainingScheduled = await prisma.scheduledPostTime.count({
          where: {
            postId: post.id,
            status: PostStatus.SCHEDULED,
          },
        })

        if (remainingScheduled === 0) {
          await prisma.telegramPost.update({
            where: { id: post.id },
            data: {
              status: PostStatus.SENT,
              postedAt: new Date(),
            },
          })
        }

        // Update group stats
        await prisma.telegramGroup.update({
          where: { id: post.groupId },
          data: {
            totalPostsSent: { increment: 1 },
          },
        })

        results.sent++
      } catch (error: any) {
        console.error(`Failed to send scheduled time ${scheduledTime.id} for post ${post.id}:`, error)

        // Update scheduled time status to failed
        await prisma.scheduledPostTime.update({
          where: { id: scheduledTime.id },
          data: {
            status: PostStatus.FAILED,
            failureReason: error.message || "Unknown error",
          },
        })

        results.failed++
        results.errors.push(`Scheduled time ${scheduledTime.id} (Post ${post.id}): ${error.message || "Unknown error"}`)
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

