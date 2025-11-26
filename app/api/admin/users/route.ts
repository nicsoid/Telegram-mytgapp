import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const guard = await requireAdminSession()
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")
  const search = searchParams.get("search")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const skip = (page - 1) * limit

  const where: any = {}
  if (role) {
    where.role = role
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { telegramUsername: { contains: search, mode: "insensitive" } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        publisher: {
          select: {
            id: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            creditTransactions: true,
            advertiserPosts: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

