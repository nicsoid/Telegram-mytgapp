import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const grantCreditsSchema = z.object({
  amount: z.number().int().min(1),
  groupId: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requireActiveSubscription()
  if ("response" in guard) return guard.response

  const { userId } = await params
  const body = await request.json()
  const { amount, groupId, notes } = grantCreditsSchema.parse(body)

  // Verify group belongs to user if groupId provided
  if (groupId) {
    const group = await prisma.telegramGroup.findFirst({
      where: {
        id: groupId,
        userId: guard.user.id,
      },
    })

    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you don't own it" },
        { status: 403 }
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    // Add credits to user
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
      },
    })

    // Create transaction record with grantedByUserId for group-owner-specific credits
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "PUBLISHER_GRANT",
        relatedGroupId: groupId || null,
        grantedByUserId: guard.user.id, // Track who granted these credits
        description: notes || `Credits granted by group owner`,
      },
    })
  })

  return NextResponse.json({ success: true, message: "Credits granted successfully" })
}

