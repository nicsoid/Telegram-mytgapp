import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // Verify token from cookie or request
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get('telegram_widget_auth')?.value

    if (!cookieToken || cookieToken !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Decode token to get user ID
    try {
      // Validate token format
      if (!token || typeof token !== 'string' || token.length === 0) {
        console.error('[verify-widget-token] Invalid token: empty or not a string')
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }

      let decoded: string
      try {
        decoded = Buffer.from(token, 'base64').toString('utf-8')
      } catch (decodeError) {
        console.error('[verify-widget-token] Base64 decode failed:', decodeError)
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }

      if (!decoded || !decoded.includes(':')) {
        console.error('[verify-widget-token] Token does not contain separator:', decoded?.substring(0, 50))
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }

      const parts = decoded.split(':')
      if (parts.length !== 2) {
        console.error('[verify-widget-token] Token has wrong number of parts:', parts.length)
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }

      const [userId, timestampStr] = parts
      
      if (!userId || !timestampStr) {
        console.error('[verify-widget-token] Missing userId or timestamp')
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }

      const timestamp = parseInt(timestampStr, 10)
      if (isNaN(timestamp)) {
        console.error('[verify-widget-token] Invalid timestamp:', timestampStr)
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }
      
      // Check if token is not too old (5 minutes)
      const tokenAge = Date.now() - timestamp
      if (tokenAge > 5 * 60 * 1000) {
        console.warn('[verify-widget-token] Token expired:', { tokenAge, timestamp, now: Date.now() })
        return NextResponse.json({ error: "Token expired" }, { status: 401 })
      }

      // Get user (defensive query - only select existing fields)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          telegramId: true,
          telegramUsername: true,
        },
      })

      if (!user) {
        console.error('[verify-widget-token] User not found:', userId)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Clear the cookie
      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
        },
      })

      response.cookies.delete('telegram_widget_auth')
      return response
    } catch (error) {
      console.error('[verify-widget-token] Unexpected error:', error)
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
    }
  } catch (error) {
    console.error("Verify widget token error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

