import { NextRequest, NextResponse } from "next/server"
import { verifyTelegramWidgetData, parseTelegramWidgetData } from "@/lib/telegram"
import { prisma } from "@/lib/prisma"

// Helper function to get base URL from environment or request headers
function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.AUTH_URL || 
         process.env.NEXTAUTH_URL ||
         (request.headers.get('x-forwarded-proto') && request.headers.get('host') 
           ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
           : request.url.split('/api')[0])
}

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
      console.error('[widget] TELEGRAM_BOT_TOKEN is not set in environment')
      return NextResponse.redirect(
        new URL("/auth/signin?error=bot_token_not_configured", getBaseUrl(request))
      )
    }

    // Verify Telegram widget data
    if (!verifyTelegramWidgetData(widgetData, botToken)) {
      console.error('[widget] Verification failed for data')
      return NextResponse.redirect(
        new URL("/auth/signin?error=invalid_telegram_data", getBaseUrl(request))
      )
    }
    
    // Parse user data
    const telegramUser = parseTelegramWidgetData(widgetData)
    if (!telegramUser) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=failed_to_parse_data", getBaseUrl(request))
      )
    }

    // Check if auth_date is recent (within 24 hours)
    const authDate = new Date(telegramUser.auth_date * 1000)
    const now = new Date()
    const hoursDiff = (now.getTime() - authDate.getTime()) / (1000 * 60 * 60)
    
    // Temporarily disable auth_date validation for testing if needed
    const disableAuthDateCheck = process.env.DISABLE_AUTH_DATE_CHECK === 'true'
    if (!disableAuthDateCheck && hoursDiff > 24) {
      console.error('[widget] Auth date expired')
      return NextResponse.redirect(
        new URL("/auth/signin?error=expired_auth", getBaseUrl(request))
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

    const callbackUrl = searchParams.get("callbackUrl") || "/"
    
    // Create auth token
    const authToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
    
    const response = NextResponse.redirect(
      new URL(`/auth/signin?widget_token=${authToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`, getBaseUrl(request))
    )
    
    // Set a secure cookie with the auth token
    response.cookies.set('telegram_widget_auth', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5, // 5 minutes
    })
    
    return response
  } catch (error) {
    console.error("Telegram widget auth error:", error)
    return NextResponse.redirect(
      new URL("/auth/signin?error=authentication_failed", getBaseUrl(request))
    )
  }
}