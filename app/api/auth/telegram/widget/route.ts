import { NextRequest, NextResponse } from "next/server"
import { verifyTelegramWidgetData, parseTelegramWidgetData } from "@/lib/telegram"
import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get all query parameters
    const widgetData: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      widgetData[key] = value
    })

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=bot_token_not_configured", request.url)
      )
    }

    // Verify Telegram widget data
    if (!verifyTelegramWidgetData(widgetData, botToken)) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=invalid_telegram_data", request.url)
      )
    }

    // Parse user data
    const telegramUser = parseTelegramWidgetData(widgetData)
    if (!telegramUser) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=failed_to_parse_data", request.url)
      )
    }

    // Check if auth_date is recent (within 24 hours)
    const authDate = new Date(telegramUser.auth_date * 1000)
    const now = new Date()
    const hoursDiff = (now.getTime() - authDate.getTime()) / (1000 * 60 * 60)
    if (hoursDiff > 24) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=expired_auth", request.url)
      )
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: telegramUser.id.toString(),
          telegramUsername: telegramUser.username || null,
          name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() || null,
          image: telegramUser.photo_url || null,
          telegramVerifiedAt: new Date(),
          role: "USER",
        },
      })
    } else {
      // Update user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: telegramUser.username || user.telegramUsername,
          name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() || user.name,
          image: telegramUser.photo_url || user.image,
          telegramVerifiedAt: user.telegramVerifiedAt || new Date(),
        },
      })
    }

    // Create a session by redirecting to a special endpoint that will handle NextAuth sign-in
    // We'll use a one-time token stored in the database or use the user ID directly
    const callbackUrl = searchParams.get("callbackUrl") || "/"
    
    // Store a temporary auth token (we'll use a simple approach with user ID + timestamp hash)
    const authToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
    
    // Store in a cookie or redirect with token
    const response = NextResponse.redirect(
      new URL(`/auth/signin?widget_token=${authToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url)
    )
    
    // Set a secure cookie with the auth token (expires in 5 minutes)
    response.cookies.set('telegram_widget_auth', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    })
    
    return response
  } catch (error) {
    console.error("Telegram widget auth error:", error)
    return NextResponse.redirect(
      new URL("/auth/signin?error=authentication_failed", request.url)
    )
  }
}
