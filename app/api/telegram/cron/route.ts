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
    // Only send posts that are due at this exact minute (not all past-due posts)
    // This prevents bulk sending of missed posts and matches uadeals behavior
    const currentMinuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)
    const currentMinuteEnd = new Date(currentMinuteStart.getTime() + 60 * 1000 - 1) // End of current minute (59.999 seconds)

    // Find scheduled times that are due in the current minute only
    const scheduledTimesToSend = await prisma.scheduledPostTime.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: {
          gte: currentMinuteStart,
          lte: currentMinuteEnd,
        },
      },
      include: {
        post: {
          include: {
            advertiser: {
              select: {
                id: true,
                credits: true,
              },
            },
            group: {
              include: {
                user: {
                  include: {
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
          
          // Refund credits if paid post
          if (post.isPaidAd && post.creditsPaid && post.creditsPaid > 0 && post.advertiserId) {
            try {
              const refundAmount: number = post.creditsPaid
              const advertiserId: string = post.advertiserId
              await prisma.$transaction(async (tx) => {
                await tx.user.update({
                  where: { id: advertiserId },
                  data: { credits: { increment: refundAmount } },
                })
                await tx.creditTransaction.create({
                  data: {
                    userId: advertiserId,
                    amount: refundAmount,
                    type: "PURCHASE",
                    relatedPostId: post.id,
                    relatedGroupId: post.groupId,
                    description: `Refund for failed post (group not verified): ${post.group.name}`,
                  },
                })
              })
            } catch (refundError) {
              console.error(`Failed to refund credits for post ${post.id}:`, refundError)
            }
          }
          
          await prisma.scheduledPostTime.update({
            where: { id: scheduledTime.id },
            data: { status: PostStatus.FAILED, failureReason: "Group not verified" },
          })
          continue
        }

        // Check if group owner has active subscription (required for posts to be sent)
        const hasActiveSubscription = (groupOwner.subscriptions && groupOwner.subscriptions.length > 0) ||
                                      (groupOwner.subscriptionStatus === "ACTIVE" &&
                                       groupOwner.subscriptionTier !== "FREE" &&
                                       (!groupOwner.subscriptionExpiresAt || new Date(groupOwner.subscriptionExpiresAt) > new Date()))

        if (!hasActiveSubscription) {
          results.errors.push(`Post ${post.id}: Group owner ${post.group.name} does not have active subscription`)
          
          // Refund credits if paid post
          if (post.isPaidAd && post.creditsPaid && post.creditsPaid > 0 && post.advertiserId) {
            try {
              const refundAmount: number = post.creditsPaid
              const advertiserId: string = post.advertiserId
              await prisma.$transaction(async (tx) => {
                await tx.user.update({
                  where: { id: advertiserId },
                  data: { credits: { increment: refundAmount } },
                })
                await tx.creditTransaction.create({
                  data: {
                    userId: advertiserId,
                    amount: refundAmount,
                    type: "PURCHASE",
                    relatedPostId: post.id,
                    relatedGroupId: post.groupId,
                    description: `Refund for failed post (subscription required): ${post.group.name}`,
                  },
                })
              })
            } catch (refundError) {
              console.error(`Failed to refund credits for post ${post.id}:`, refundError)
            }
          }
          
          await prisma.scheduledPostTime.update({
            where: { id: scheduledTime.id },
            data: { status: PostStatus.FAILED, failureReason: "Group owner subscription required" },
          })
          continue
        }

        // For Telegram, if we have newlines but no HTML tags, use plain text mode
        // Otherwise use HTML mode but ensure no <br> tags
        const hasHtmlTags = /<[a-z][\s\S]*>/i.test(captionHtml)
        const parseMode = hasHtmlTags ? ("HTML" as const) : undefined
        
        if (!mediaUrls.length) {
          await sendTelegramMessage(chatId, captionHtml, {
            parseMode: parseMode,
          })
        } else if (mediaUrls.length === 1) {
          const mediaUrl = mediaUrls[0]
          const type = getMediaType(mediaUrl)
          const caption = prepareCaption(captionHtml)
          if (type === "video") {
            await sendTelegramVideo(chatId, mediaUrl, {
              caption,
              parseMode: parseMode,
            })
          } else {
            await sendTelegramPhoto(chatId, mediaUrl, {
              caption,
              parseMode: parseMode,
            })
          }
        } else {
          const caption = prepareCaption(captionHtml)
          const mediaItems = mediaUrls.slice(0, 10).map((url, index) => ({
            type: getMediaType(url),
            media: url,
            caption: index === 0 ? caption : undefined,
            parse_mode: index === 0 ? parseMode : undefined,
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

        // If this is a paid post, refund credits to the advertiser
        if (post.isPaidAd && post.creditsPaid && post.creditsPaid > 0 && post.advertiserId) {
          try {
            const refundAmount: number = post.creditsPaid
            const advertiserId: string = post.advertiserId
            await prisma.$transaction(async (tx) => {
              // Refund credits to advertiser
              await tx.user.update({
                where: { id: advertiserId },
                data: {
                  credits: { increment: refundAmount },
                },
              })

              // Create refund transaction
              await tx.creditTransaction.create({
                data: {
                  userId: advertiserId,
                  amount: refundAmount,
                  type: "PURCHASE", // Using PURCHASE type for refunds (positive amount)
                  relatedPostId: post.id,
                  relatedGroupId: post.groupId,
                  description: `Refund for failed post in group: ${post.group.name}`,
                },
              })

              // Reverse earnings from group owner (if they received earnings)
              const groupOwner = post.group.user
              const commissionPercent = groupOwner.revenueSharePercent || 0.2 // Default 20%
              const ownerEarnings = Math.floor(refundAmount * (1 - commissionPercent))

              if (ownerEarnings > 0) {
                await tx.user.update({
                  where: { id: groupOwner.id },
                  data: {
                    credits: { decrement: ownerEarnings },
                    totalEarnings: { decrement: ownerEarnings },
                  },
                })

                await tx.creditTransaction.create({
                  data: {
                    userId: groupOwner.id,
                    amount: -ownerEarnings,
                    type: "SPENT", // Negative transaction to reverse earnings
                    relatedPostId: post.id,
                    relatedGroupId: post.groupId,
                    description: `Reversed earnings from failed post in ${post.group.name}`,
                  },
                })

                // Reverse group revenue
                await tx.telegramGroup.update({
                  where: { id: post.groupId },
                  data: {
                    totalRevenue: { decrement: ownerEarnings },
                  },
                })
              }
            })

            console.log(`Refunded ${post.creditsPaid} credits to advertiser ${post.advertiserId} for failed post ${post.id}`)
          } catch (refundError: any) {
            console.error(`Failed to refund credits for post ${post.id}:`, refundError)
            // Continue with marking as failed even if refund fails
          }
        }

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

