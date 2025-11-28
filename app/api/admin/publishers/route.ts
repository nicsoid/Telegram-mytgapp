import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const guard = await requireAdminSession()
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const subscriptionTier = searchParams.get("subscriptionTier")
  const subscriptionStatus = searchParams.get("subscriptionStatus")
  const isVerified = searchParams.get("isVerified")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const skip = (page - 1) * limit

  const where: any = {
    // Only show users who have groups or subscriptions (active publishers)
    OR: [
      { groups: { some: {} } },
      { subscriptions: { some: { status: "ACTIVE" } } },
    ],
  }

  if (search) {
    where.OR = [
      ...(where.OR || []),
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { telegramUsername: { contains: search, mode: "insensitive" } },
    ]
  }

  if (subscriptionTier) {
    where.subscriptionTier = subscriptionTier
  }

  if (subscriptionStatus) {
    where.subscriptionStatus = subscriptionStatus
  }

  if (isVerified !== null && isVerified !== undefined) {
    where.isVerified = isVerified === "true"
  }

  // Get users with groups/subscriptions (these are the "publishers" now)
  const [publishers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        groups: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            isActive: true,
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
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    publishers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

