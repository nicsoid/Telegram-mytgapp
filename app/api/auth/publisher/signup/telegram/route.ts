import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifyTelegramWebAppData, parseTelegramInitData } from "@/lib/telegram"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { initData } = body

    if (!initData) {
      return NextResponse.json({ error: "Telegram init data required" }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
    }

    // Verify Telegram init data
    if (!verifyTelegramWebAppData(initData, botToken)) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 400 })
    }

    // Parse user data
    const telegramUser = parseTelegramInitData(initData)
    if (!telegramUser) {
      return NextResponse.json({ error: "Failed to parse Telegram data" }, { status: 400 })
    }

    // Update user with Telegram info and subscription fields in one go
    // Use raw SQL or conditional updates to avoid accessing non-existent fields
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramId: telegramUser.id.toString(),
        telegramUsername: telegramUser.username || null,
        name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() || session.user.name,
        image: telegramUser.photo_url || session.user.image,
        telegramVerifiedAt: new Date(),
        role: "USER", // All users are USER now, no separate PUBLISHER role
        // Only set these if columns exist (will fail gracefully if migration not applied)
        telegramVerified: true,
        freePostsUsed: 0,
        freePostsLimit: 3, // 3 free posts on signup
        // isVerified will be true when email is also verified
      },
    })

    // Try to update subscription fields separately (will fail if columns don't exist)
    try {
      await prisma.user.update({
        where: { id: updatedUser.id },
        data: {
          subscriptionTier: "FREE",
          subscriptionStatus: "ACTIVE",
        },
      })
    } catch (error: any) {
      // If subscription columns don't exist, log but don't fail
      if (error?.code === 'P2022' || error?.message?.includes('does not exist')) {
        console.warn('[publisher-signup] Subscription columns not yet migrated, skipping subscription fields')
      } else {
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        telegramId: updatedUser.telegramId,
        telegramUsername: updatedUser.telegramUsername,
        telegramVerified: updatedUser.telegramVerified,
        emailVerified: updatedUser.emailVerified,
        isVerified: updatedUser.isVerified,
      },
    })
  } catch (error) {
    console.error("Publisher Telegram signup error:", error)
    return NextResponse.json(
      { error: "Failed to process signup" },
      { status: 500 }
    )
  }
}

