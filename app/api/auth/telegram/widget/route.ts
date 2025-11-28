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
      console.error('[widget] TELEGRAM_BOT_TOKEN is not set in environment')
      return NextResponse.redirect(
        new URL("/auth/signin?error=bot_token_not_configured", getBaseUrl(request))
      )
    }
    const normalizedBotToken = botToken.trim()
    if (normalizedBotToken.length !== botToken.length) {
      console.warn("[widget] TELEGRAM_BOT_TOKEN has leading/trailing whitespace. Trimmed automatically.")
    }

    if (!verifyTelegramWidgetData(widgetData, normalizedBotToken)) {
      console.error('[widget] Verification failed for data:', {
        keys: Object.keys(widgetData),
        hash: widgetData.hash?.substring(0, 10) + '...',
      })
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
    const serverTime = Math.floor(now.getTime() / 1000)
    const hoursDiff = (now.getTime() - authDate.getTime()) / (1000 * 60 * 60)
    
    // Temporarily disable auth_date validation for testing (set DISABLE_AUTH_DATE_CHECK=true in .env)
    const disableAuthDateCheck = process.env.DISABLE_AUTH_DATE_CHECK === 'true'
    if (disableAuthDateCheck) {
      console.warn('[widget] ⚠️  Auth date validation is DISABLED for testing')
    } else if (hoursDiff > 24) {
      console.error('[widget] Auth date expired:', {
        hoursDiff: hoursDiff.toFixed(2),
        authDate: authDate.toISOString(),
        serverTime: now.toISOString(),
      })
      return NextResponse.redirect(
        new URL("/auth/signin?error=expired_auth", getBaseUrl(request))
      )
    }

    // Find or create user
    // Use select to only get fields that definitely exist (defensive query)
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() },
      select: {
        id: true,
        telegramId: true,
        telegramUsername: true,
        name: true,
        image: true,
        email: true,
        telegramVerifiedAt: true,
        role: true,
      },
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
        select: {
          id: true,
          telegramId: true,
          telegramUsername: true,
          name: true,
          image: true,
          email: true,
          telegramVerifiedAt: true,
          role: true,
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
        select: {
          id: true,
          telegramId: true,
          telegramUsername: true,
          name: true,
          image: true,
          email: true,
          telegramVerifiedAt: true,
          role: true,
        },
      })
    }

    // Create a session by redirecting to signin page with widget token
    // Always use "/" as callbackUrl to prevent redirect loops
    const callbackUrl = "/"
    const baseUrl = getBaseUrl(request)
    const baseDomain = (() => {
      try {
        return new URL(baseUrl).hostname
      } catch {
        return undefined
      }
    })()
    
    // Store a temporary auth token (we'll use a simple approach with user ID + timestamp hash)
    // Ensure user.id is a string and timestamp is a number
    const userId = user.id.toString()
    const timestamp = Date.now().toString()
    const authToken = Buffer.from(`${userId}:${timestamp}`).toString('base64')
    
    // Store in a cookie or redirect with token
    const response = NextResponse.redirect(
      new URL(`/auth/signin?widget_token=${authToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`, baseUrl)
    )
    
    // Set a secure cookie with the auth token (expires in 5 minutes)
    response.cookies.set('telegram_widget_auth', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/',
      domain: baseDomain && baseDomain !== 'localhost' && baseDomain !== '127.0.0.1' ? baseDomain : undefined,
    })
    
    return response
  } catch (error) {
    console.error("Telegram widget auth error:", error)
    return NextResponse.redirect(
      new URL("/auth/signin?error=authentication_failed", getBaseUrl(request))
    )
  }
}
