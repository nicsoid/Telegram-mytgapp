import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const grantCreditsSchema = z.object({
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
    const { userId, amount, notes } = grantCreditsSchema.parse(body)

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Grant credits
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: amount },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          type: "PUBLISHER_GRANT",
          grantedByUserId: session.user.id,
          description: notes || `Credits granted by ${session.user.name || session.user.telegramUsername || "group owner"}`,
        },
      })
    })

    return NextResponse.json({ success: true, message: "Credits granted successfully" })
  } catch (error) {
    console.error("Error granting credits:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to grant credits" },
      { status: 500 }
    )
  }
}

