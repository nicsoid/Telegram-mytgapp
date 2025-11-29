import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get sticky post requests - for group owners (received) or users (sent)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "received" // "received" or "sent"
    const status = searchParams.get("status") // Optional filter by status
    const groupId = searchParams.get("groupId") // Optional filter by group

    const where: any = {}

    if (type === "received") {
      // Requests received by the current user (they own the groups)
      where.groupOwnerId = session.user.id
    } else {
      // Requests sent by the current user
      where.userId = session.user.id
    }

    if (status) {
      where.status = status
    }

    if (groupId) {
      where.groupId = groupId
    }

    const requests = await prisma.stickyPostRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        groupOwner: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Error fetching sticky post requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch sticky post requests" },
      { status: 500 }
    )
  }
}

