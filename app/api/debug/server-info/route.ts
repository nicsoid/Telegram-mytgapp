import { NextResponse } from "next/server"
import { verifyTelegramWidgetData } from "@/lib/telegram"

/**
 * Debug endpoint to check server time and environment variables
 * Access at: /api/debug/server-info
 * 
 * Also accepts a test payload to verify hash:
 * POST /api/debug/server-info with body: { id, first_name, last_name, username, photo_url, auth_date, hash }
 */
export async function GET() {
  const now = new Date()
  const serverTime = Math.floor(now.getTime() / 1000)
  
  // Get bot token info (masked for security)
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const botTokenPreview = botToken 
    ? `${botToken.substring(0, 20)}... (length: ${botToken.length})`
    : 'NOT SET'
  const botId = botToken ? botToken.split(':')[0] : 'UNKNOWN'
  
  return NextResponse.json({
    server: {
      time: {
        unix: serverTime,
        iso: now.toISOString(),
        local: now.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    bot: {
      tokenPreview: botTokenPreview,
      botId: botId,
      username: process.env.TELEGRAM_BOT_USERNAME || 'NOT SET',
      publicUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'NOT SET',
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
      authUrl: process.env.AUTH_URL || 'NOT SET',
      publicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    },
    flags: {
      disableAuthDateCheck: process.env.DISABLE_AUTH_DATE_CHECK === 'true',
    },
  })
}

export async function POST(request: Request) {
  try {
    const testData = await request.json()
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    
    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 })
    }
    
    const isValid = verifyTelegramWidgetData(testData, botToken)
    
    return NextResponse.json({
      testData,
      botTokenPreview: botToken.substring(0, 20) + '...',
      botId: botToken.split(':')[0],
      hashValid: isValid,
      message: isValid 
        ? '✅ Hash matches! Bot token is correct.' 
        : '❌ Hash mismatch! Widget is using a different bot token.',
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Invalid request', 
      message: error.message 
    }, { status: 400 })
  }
}

