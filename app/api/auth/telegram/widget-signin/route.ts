import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramUserId } = body

    if (!telegramUserId) {
      return NextResponse.json({ error: "Telegram user ID required" }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: telegramUserId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create a session using NextAuth
    // We'll return the user data and let the client handle the sign-in
    return NextResponse.json({
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
  } catch (error) {
    console.error("Widget sign-in error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

