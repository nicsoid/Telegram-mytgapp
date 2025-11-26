import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addUserSchema = z.object({
  userId: z.string(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const managedUsers = await prisma.publisherManagedUser.findMany({
    where: { publisherId: guard.publisher.id },
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
  })

  return NextResponse.json({ users: managedUsers })
}

export async function POST(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const body = await request.json()
  const { userId, notes } = addUserSchema.parse(body)

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Check if already managed
  const existing = await prisma.publisherManagedUser.findUnique({
    where: {
      publisherId_userId: {
        publisherId: guard.publisher.id,
        userId,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ error: "User already in managed list" }, { status: 400 })
  }

  const managedUser = await prisma.publisherManagedUser.create({
    data: {
      publisherId: guard.publisher.id,
      userId,
      notes: notes || null,
    },
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
  })

  return NextResponse.json({ user: managedUser })
}

