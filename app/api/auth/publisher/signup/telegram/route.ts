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

    // Update user with Telegram info
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramId: telegramUser.id.toString(),
        telegramUsername: telegramUser.username || null,
        name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() || session.user.name,
        image: telegramUser.photo_url || session.user.image,
        telegramVerifiedAt: new Date(),
        role: "PUBLISHER",
      },
    })

    // Create or update publisher profile
    let publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
    })

    if (!publisher) {
      publisher = await prisma.publisher.create({
        data: {
          userId: user.id,
          subscriptionTier: "FREE",
          subscriptionStatus: "ACTIVE",
          telegramVerified: true,
          isVerified: false, // Will be true when email is also verified
          freePostsUsed: 0,
          freePostsLimit: 3, // 3 free posts on signup
        },
      })
    } else {
      publisher = await prisma.publisher.update({
        where: { id: publisher.id },
        data: {
          telegramVerified: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        telegramVerified: publisher.telegramVerified,
        emailVerified: publisher.emailVerified,
        isVerified: publisher.isVerified,
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

