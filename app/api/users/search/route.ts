import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Search for user by Telegram username
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  // Remove @ if present
  const cleanUsername = username.replace(/^@/, "")

  // Search for user by telegram username
  const user = await prisma.user.findFirst({
    where: {
      telegramUsername: {
        equals: cleanUsername,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      telegramUsername: true,
      groups: {
        where: {
          isVerified: true,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          pricePerPost: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ user })
}

