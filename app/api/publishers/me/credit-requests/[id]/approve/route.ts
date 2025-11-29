import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const approveSchema = z.object({
  amount: z.number().int().optional(), // Optional: can approve different amount
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveSubscription()
  if ("response" in guard) return guard.response

  const { id } = await params
  const body = await request.json()
  const { amount, notes } = approveSchema.parse(body)

  const creditRequest = await prisma.creditRequest.findUnique({
    where: { id },
    include: { user: true },
  })

  if (!creditRequest) {
    return NextResponse.json({ error: "Credit request not found" }, { status: 404 })
  }

  if (creditRequest.groupOwnerId !== guard.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (creditRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Credit request already processed" },
      { status: 400 }
    )
  }

  const approvedAmount = amount ?? creditRequest.amount

  await prisma.$transaction(async (tx) => {
    // Update user credits
    await tx.user.update({
      where: { id: creditRequest.userId },
      data: {
        credits: { increment: approvedAmount },
      },
    })

    // Create transaction record with grantedByUserId for group-owner-specific credits
    await tx.creditTransaction.create({
      data: {
        userId: creditRequest.userId,
        amount: approvedAmount,
        type: "PUBLISHER_GRANT",
        relatedGroupId: creditRequest.groupId || null,
        grantedByUserId: guard.user.id, // Track who granted these credits
        description: `Approved credit request: ${creditRequest.reason || "No reason provided"}`,
      },
    })

    // Update credit request
    await tx.creditRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        processedBy: guard.user.id,
        processedAt: new Date(),
        notes: notes || creditRequest.notes,
      },
    })
  })

  return NextResponse.json({ success: true, message: "Credit request approved" })
}

