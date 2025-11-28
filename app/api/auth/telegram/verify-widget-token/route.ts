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
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [userId, timestamp] = decoded.split(':')
      
      // Check if token is not too old (5 minutes)
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 5 * 60 * 1000) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 })
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
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
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
    }
  } catch (error) {
    console.error("Verify widget token error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

