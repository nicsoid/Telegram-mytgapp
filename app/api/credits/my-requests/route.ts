import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// API for users to view their own credit request history
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") // Optional filter by status

  // Get credit requests where current user is the requester
  const where: any = {
    userId: session.user.id,
  }

  if (status) {
    where.status = status
  }

  const requests = await prisma.creditRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      groupOwner: {
        select: {
          id: true,
          name: true,
          email: true,
          telegramUsername: true,
        },
      },
    },
  })

  return NextResponse.json({
    requests,
  })
}

