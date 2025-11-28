import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const guard = await requireAdminSession()
  if ("response" in guard) return guard.response

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groups: {
        select: {
          id: true,
          name: true,
          username: true,
          isVerified: true,
          isActive: true,
          pricePerPost: true,
          createdAt: true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
      advertiserPosts: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 50,
      },
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      _count: {
        select: {
          advertiserPosts: true,
          creditTransactions: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ user })
}

