import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
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
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const { userId } = await params
  const body = await request.json()
  const { amount, groupId, notes } = grantCreditsSchema.parse(body)

  // Verify user is in publisher's managed list
  const managedUser = await prisma.publisherManagedUser.findUnique({
    where: {
      publisherId_userId: {
        publisherId: guard.publisher.id,
        userId,
      },
    },
  })

  if (!managedUser) {
    return NextResponse.json(
      { error: "User is not in your managed list" },
      { status: 403 }
    )
  }

  await prisma.$transaction(async (tx) => {
    // Add credits to user
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
      },
    })

    // Create transaction record
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "PUBLISHER_GRANT",
        relatedGroupId: groupId || null,
        description: notes || `Credits granted by publisher ${guard.publisher.id}`,
      },
    })

    // Update managed user record
    await tx.publisherManagedUser.update({
      where: {
        publisherId_userId: {
          publisherId: guard.publisher.id,
          userId,
        },
      },
      data: {
        creditsAdded: { increment: amount },
      },
    })
  })

  return NextResponse.json({ success: true, message: "Credits granted successfully" })
}

