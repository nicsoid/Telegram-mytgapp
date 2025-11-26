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

  const where: any = {}

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { telegramUsername: { contains: search, mode: "insensitive" } },
      ],
    }
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

  const [publishers, total] = await Promise.all([
    prisma.publisher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            telegramUsername: true,
            credits: true,
            createdAt: true,
          },
        },
        groups: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            isActive: true,
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
    }),
    prisma.publisher.count({ where }),
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

