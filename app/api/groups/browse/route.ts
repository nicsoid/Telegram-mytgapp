import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all verified, active groups that are available for posting
  const groups = await prisma.telegramGroup.findMany({
    where: {
      isVerified: true,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          telegramUsername: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return NextResponse.json({ groups })
}

