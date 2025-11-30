import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ownerId = searchParams.get("ownerId")

  if (!ownerId) {
    return NextResponse.json({ error: "ownerId is required" }, { status: 400 })
  }

  // Calculate credits granted by this owner to the current user
  // Credits are tracked via CreditTransaction with grantedByUserId
  const transactions = await prisma.creditTransaction.findMany({
    where: {
      userId: session.user.id,
      grantedByUserId: ownerId,
      type: "PUBLISHER_GRANT",
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Calculate total credits granted by this owner
  const totalGranted = transactions.reduce((sum, t) => sum + t.amount, 0)

  // Calculate credits spent on this owner's groups
  const spentTransactions = await prisma.creditTransaction.findMany({
    where: {
      userId: session.user.id,
      type: "SPENT",
      relatedGroupId: {
        not: null,
      },
    },
    include: {
      // We need to check if the group belongs to this owner
      // Since we can't join directly, we'll filter in code
    },
  })

  // Get all groups owned by this owner
  const ownerGroups = await prisma.telegramGroup.findMany({
    where: {
      userId: ownerId,
    },
    select: {
      id: true,
    },
  })

  const ownerGroupIds = new Set(ownerGroups.map((g) => g.id))

  // Calculate total spent on this owner's groups
  const totalSpent = spentTransactions
    .filter((t) => t.relatedGroupId && ownerGroupIds.has(t.relatedGroupId))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Available credits for this owner = granted - spent
  const availableCredits = totalGranted - totalSpent

  return NextResponse.json({
    ownerId,
    totalGranted,
    totalSpent,
    availableCredits: Math.max(0, availableCredits), // Don't show negative
    transactions: transactions.slice(0, 10), // Last 10 transactions
  })
}
