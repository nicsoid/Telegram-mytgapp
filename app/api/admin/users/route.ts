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

  // Try to fetch with subscription fields, fallback to basic fields if migration not applied
  let users: any[]
  try {
    users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        telegramUsername: true,
        role: true,
        credits: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            creditTransactions: true,
            advertiserPosts: true,
          },
        },
      },
    })
  } catch (error: any) {
    // If subscription columns don't exist yet, fetch without them
    if (error?.code === 'P2022' || error?.message?.includes('does not exist')) {
      console.warn('[admin/users] Subscription columns not yet migrated, fetching without subscription fields')
      users = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          telegramUsername: true,
          role: true,
          credits: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              creditTransactions: true,
              advertiserPosts: true,
            },
          },
        },
      })
      // Add default values for subscription fields
      users = users.map(user => ({
        ...user,
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
      }))
    } else {
      throw error
    }
  }

  const total = await prisma.user.count({ where })

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

