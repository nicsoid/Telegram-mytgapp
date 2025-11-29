import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const deductCreditsSchema = z.object({
  userId: z.string(),
  amount: z.number().int().min(1),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, amount, notes } = deductCreditsSchema.parse(body)

    // Verify user exists and has enough credits
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has enough credits (check both general credits and credits from this grantor)
    const grantedCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        type: "PUBLISHER_GRANT",
        grantedByUserId: session.user.id,
      },
      _sum: {
        amount: true,
      },
    })

    const spentCredits = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        type: "SPENT",
        relatedGroupId: { in: await prisma.telegramGroup.findMany({ where: { userId: session.user.id }, select: { id: true } }).then(groups => groups.map(g => g.id)) },
      },
      _sum: {
        amount: true,
      },
    })

    const availableFromGrantor = (grantedCredits._sum.amount || 0) + (spentCredits._sum.amount || 0)
    const totalAvailable = targetUser.credits

    if (totalAvailable < amount && availableFromGrantor < amount) {
      return NextResponse.json(
        { error: "User does not have enough credits to deduct" },
        { status: 400 }
      )
    }

    // Deduct credits
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: amount },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: "SPENT",
          grantedByUserId: session.user.id,
          description: notes || `Credits deducted by ${session.user.name || session.user.telegramUsername || "group owner"}`,
        },
      })
    })

    return NextResponse.json({ success: true, message: "Credits deducted successfully" })
  } catch (error) {
    console.error("Error deducting credits:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to deduct credits" },
      { status: 500 }
    )
  }
}

