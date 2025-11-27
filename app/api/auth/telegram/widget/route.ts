import { NextRequest, NextResponse } from "next/server"
import { verifyTelegramWidgetData, parseTelegramWidgetData } from "@/lib/telegram"
import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"

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
      return NextResponse.redirect(
        new URL("/auth/signin?error=bot_token_not_configured", getBaseUrl(request))
      )
    }
    const normalizedBotToken = botToken.trim()
    if (normalizedBotToken.length !== botToken.length) {
      console.warn("[widget] TELEGRAM_BOT_TOKEN has leading/trailing whitespace. Trimmed automatically.")
    }

    // Verify Telegram widget data
    console.log('[widget] Received widget data:', {
      keys: Object.keys(widgetData),
      hasHash: !!widgetData.hash,
      botTokenConfigured: !!normalizedBotToken,
    })
    
    if (!verifyTelegramWidgetData(widgetData, normalizedBotToken)) {
      console.error('[widget] Verification failed for data:', {
        keys: Object.keys(widgetData),
        hash: widgetData.hash?.substring(0, 10) + '...',
      })
      return NextResponse.redirect(
        new URL("/auth/signin?error=invalid_telegram_data", getBaseUrl(request))
      )
    }
    
    console.log('[widget] Verification successful')

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
    if (hoursDiff > 24) {
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

    // Create a session by redirecting to a special endpoint that will handle NextAuth sign-in
    // We'll use a one-time token stored in the database or use the user ID directly
    const callbackUrl = searchParams.get("callbackUrl") || "/"
    
    // Store a temporary auth token (we'll use a simple approach with user ID + timestamp hash)
    const authToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
    
    // Store in a cookie or redirect with token
    const response = NextResponse.redirect(
      new URL(`/auth/signin?widget_token=${authToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`, getBaseUrl(request))
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
      new URL("/auth/signin?error=authentication_failed", getBaseUrl(request))
    )
  }
}
