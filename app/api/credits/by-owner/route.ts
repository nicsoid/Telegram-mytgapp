import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get credits grouped by the user who granted them (group owners)
// This shows which credits can be used for which groups
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all credit transactions where credits were granted by someone (PUBLISHER_GRANT)
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: {
        userId: session.user.id,
        type: "PUBLISHER_GRANT",
        grantedByUserId: { not: null },
      },
      include: {
        // Get the user who granted these credits
        // Note: We need to manually fetch this since there's no direct relation
      },
      orderBy: { createdAt: "desc" },
    })

    // Group credits by grantedByUserId
    const creditsByOwner: Record<
      string,
      {
        ownerId: string
        ownerName: string | null
        ownerUsername: string | null
        totalCredits: number
        groups: Array<{
          id: string
          name: string
          username: string | null
          pricePerPost: number
        }>
        transactions: Array<{
          id: string
          amount: number
          createdAt: Date
          description: string | null
          relatedGroupId: string | null
        }>
      }
    > = {}

    // Fetch owner details and their groups
    for (const transaction of creditTransactions) {
      if (!transaction.grantedByUserId) continue

      if (!creditsByOwner[transaction.grantedByUserId]) {
        // Fetch owner details
        const owner = await prisma.user.findUnique({
          where: { id: transaction.grantedByUserId },
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        })

        // Fetch owner's groups
        const ownerGroups = await prisma.telegramGroup.findMany({
          where: {
            userId: transaction.grantedByUserId,
            isVerified: true,
          },
          select: {
            id: true,
            name: true,
            username: true,
            pricePerPost: true,
          },
        })

        creditsByOwner[transaction.grantedByUserId] = {
          ownerId: transaction.grantedByUserId,
          ownerName: owner?.name || null,
          ownerUsername: owner?.telegramUsername || null,
          totalCredits: 0,
          groups: ownerGroups,
          transactions: [],
        }
      }

      // Add transaction to the owner's list
      creditsByOwner[transaction.grantedByUserId].transactions.push({
        id: transaction.id,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        description: transaction.description,
        relatedGroupId: transaction.relatedGroupId,
      })

      // Sum up total credits (only positive amounts from grants)
      if (transaction.amount > 0) {
        creditsByOwner[transaction.grantedByUserId].totalCredits += transaction.amount
      }
    }

    // Convert to array format
    const creditsByOwnerArray = Object.values(creditsByOwner).map((ownerCredits) => ({
      ...ownerCredits,
      // Calculate remaining credits (total granted - spent on this owner's groups)
      remainingCredits: ownerCredits.totalCredits,
    }))

    // Calculate remaining credits by subtracting spent credits on these groups
    for (const ownerCredits of creditsByOwnerArray) {
      const spentOnOwnerGroups = await prisma.creditTransaction.aggregate({
        where: {
          userId: session.user.id,
          type: "SPENT",
          relatedGroupId: { in: ownerCredits.groups.map((g) => g.id) },
          // Only count if spent after the grants
          createdAt: {
            gte: ownerCredits.transactions[ownerCredits.transactions.length - 1]?.createdAt || new Date(0),
          },
        },
        _sum: {
          amount: true,
        },
      })

      ownerCredits.remainingCredits =
        ownerCredits.totalCredits + (spentOnOwnerGroups._sum.amount || 0)
    }

    return NextResponse.json({
      creditsByOwner: creditsByOwnerArray,
    })
  } catch (error) {
    console.error("Error fetching credits by owner:", error)
    return NextResponse.json(
      { error: "Failed to fetch credits by owner" },
      { status: 500 }
    )
  }
}

