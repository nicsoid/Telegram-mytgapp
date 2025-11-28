import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
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
  const guard = await requirePublisherSession()
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

  if (creditRequest.publisherId !== guard.publisher.id) {
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

    // Create transaction record
    await tx.creditTransaction.create({
      data: {
        userId: creditRequest.userId,
        amount: approvedAmount,
        type: "PUBLISHER_GRANT",
        description: `Approved credit request from publisher: ${creditRequest.reason || "No reason provided"}`,
      },
    })

    // Update managed user record if exists
    const managedUser = await tx.publisherManagedUser.findUnique({
      where: {
        publisherId_userId: {
          publisherId: guard.publisher.id,
          userId: creditRequest.userId,
        },
      },
    })

    if (managedUser) {
      await tx.publisherManagedUser.update({
        where: {
          publisherId_userId: {
            publisherId: guard.publisher.id,
            userId: creditRequest.userId,
          },
        },
        data: {
          creditsAdded: { increment: approvedAmount },
        },
      })
    } else {
      // Auto-add user to managed list if not already there
      await tx.publisherManagedUser.create({
        data: {
          publisherId: guard.publisher.id,
          userId: creditRequest.userId,
          creditsAdded: approvedAmount,
        },
      })
    }

    // Update credit request
    await tx.creditRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        processedBy: guard.session.user.id,
        processedAt: new Date(),
        notes: notes || creditRequest.notes,
      },
    })
  })

  return NextResponse.json({ success: true, message: "Credit request approved" })
}

