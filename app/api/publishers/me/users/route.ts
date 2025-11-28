import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addUserSchema = z.object({
  userId: z.string(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const guard = await requireActiveSubscription()
  if ("response" in guard) return guard.response

  // Get users who have requested credits from this user (group owner)
  const creditRequests = await prisma.creditRequest.findMany({
    where: { groupOwnerId: guard.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          telegramUsername: true,
          credits: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["userId"],
  })

  const users = creditRequests.map((req) => req.user)

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  // POST removed - users are automatically added when they request credits
  // No need for manual user management
  return NextResponse.json(
    { error: "Users are automatically added when they request credits for your groups" },
    { status: 400 }
  )
}

