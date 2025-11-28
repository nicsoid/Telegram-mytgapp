import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// API for group owners to view credit requests for their groups
// Does NOT require subscription - any user who owns groups can see requests
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "PENDING"

  // Get credit requests where current user is the group owner
  const [requests, pendingCount] = await Promise.all([
    prisma.creditRequest.findMany({
      where: {
        groupOwnerId: session.user.id,
        status: status as any,
      },
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
        groupOwnerId: session.user.id,
        status: "PENDING",
      },
    }),
  ])

  return NextResponse.json({
    requests,
    pendingCount,
  })
}

