import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users who have received credits from the current user
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: {
        grantedByUserId: session.user.id,
        type: "PUBLISHER_GRANT",
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

    // Group by user and calculate totals
    const customerMap = new Map<string, {
      userId: string
      userName: string | null
      userTelegramUsername: string | null
      totalCreditsGranted: number
      totalCreditsSpent: number
      groups: Set<string>
    }>()

    for (const tx of creditTransactions) {
      const userId = tx.userId
      if (!customerMap.has(userId)) {
        customerMap.set(userId, {
          userId,
          userName: tx.user.name,
          userTelegramUsername: tx.user.telegramUsername,
          totalCreditsGranted: 0,
          totalCreditsSpent: 0,
          groups: new Set(),
        })
      }

      const customer = customerMap.get(userId)!
      customer.totalCreditsGranted += tx.amount
    }

    // Get groups owned by current user
    const myGroups = await prisma.telegramGroup.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        username: true,
        pricePerPost: true,
      },
    })

    // Get spent credits for each customer on current user's groups
    for (const [userId, customer] of customerMap.entries()) {
      const spentTransactions = await prisma.creditTransaction.findMany({
        where: {
          userId,
          type: "SPENT",
          relatedGroupId: { in: myGroups.map(g => g.id) },
        },
      })

      for (const tx of spentTransactions) {
        customer.totalCreditsSpent += Math.abs(tx.amount)
        if (tx.relatedGroupId) {
          customer.groups.add(tx.relatedGroupId)
        }
      }
    }

    // Build customer list with groups
    const customers = Array.from(customerMap.values()).map((customer) => {
      const remainingCredits = customer.totalCreditsGranted - customer.totalCreditsSpent
      const groups = myGroups.filter(g => customer.groups.has(g.id))

      return {
        userId: customer.userId,
        userName: customer.userName,
        userTelegramUsername: customer.userTelegramUsername,
        totalCreditsGranted: customer.totalCreditsGranted,
        totalCreditsSpent: customer.totalCreditsSpent,
        remainingCredits: Math.max(0, remainingCredits),
        groups,
      }
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    )
  }
}

