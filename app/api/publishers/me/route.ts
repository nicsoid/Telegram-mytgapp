import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const guard = await requireActiveSubscription()
  if ("response" in guard) return guard.response

  const user = await prisma.user.findUnique({
    where: { id: guard.user.id },
    include: {
      groups: {
        select: {
          id: true,
          name: true,
          isVerified: true,
          isActive: true,
          totalPostsScheduled: true,
          totalPostsSent: true,
          totalRevenue: true,
        },
      },
      subscriptions: {
        where: { status: "ACTIVE" },
      },
      _count: {
        select: {
          groups: true,
          ownerPosts: true,
        },
      },
    },
  })

  return NextResponse.json({ user })
}

