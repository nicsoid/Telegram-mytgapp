import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Approve credit request (no subscription required - any group owner can approve)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Get the credit request
  const creditRequest = await prisma.creditRequest.findUnique({
    where: { id },
    include: {
      user: true,
    },
  })

  if (!creditRequest) {
    return NextResponse.json({ error: "Credit request not found" }, { status: 404 })
  }

  // Verify user is the group owner
  if (creditRequest.groupOwnerId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (creditRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Request is not pending" },
      { status: 400 }
    )
  }

  // Approve the request
  await prisma.$transaction(async (tx) => {
    // Grant credits to the user
    await tx.user.update({
      where: { id: creditRequest.userId },
      data: {
        credits: { increment: creditRequest.amount },
      },
    })

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId: creditRequest.userId,
        amount: creditRequest.amount,
        type: "PUBLISHER_GRANT",
        relatedGroupId: creditRequest.groupId || undefined,
        description: `Credits granted by group owner`,
      },
    })

    // Update request status
    await tx.creditRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        processedBy: session.user.id,
        processedAt: new Date(),
      },
    })
  })

  return NextResponse.json({ success: true })
}

