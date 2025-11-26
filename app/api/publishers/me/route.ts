import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const publisher = await prisma.publisher.findUnique({
    where: { id: guard.publisher.id },
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
      _count: {
        select: {
          groups: true,
          posts: true,
          managedUsers: true,
        },
      },
    },
  })

  return NextResponse.json({ publisher })
}

