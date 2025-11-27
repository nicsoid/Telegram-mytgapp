import { NextResponse } from "next/server"

/**
 * Debug endpoint to check server time and environment variables
 * Access at: /api/debug/server-info
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

