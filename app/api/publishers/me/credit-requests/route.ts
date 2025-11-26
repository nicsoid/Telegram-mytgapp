import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "PENDING"
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const skip = (page - 1) * limit

  const [requests, total] = await Promise.all([
    prisma.creditRequest.findMany({
      where: {
        publisherId: guard.publisher.id,
        status,
      },
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
          },
        },
      },
    }),
    prisma.creditRequest.count({
      where: {
        publisherId: guard.publisher.id,
        status,
      },
    }),
  ])

  return NextResponse.json({
    requests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

