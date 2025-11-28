import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const requestSchema = z.object({
  amount: z.number().int().min(1).max(10000),
  reason: z.string().optional(),
  groupOwnerId: z.string(), // Required: users request from group owners
  groupId: z.string().optional(), // Optional: specific group the credits are for
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { amount, reason, groupOwnerId, groupId } = requestSchema.parse(body)

  // Verify group owner exists
  const groupOwner = await prisma.user.findUnique({
    where: { id: groupOwnerId },
  })

  if (!groupOwner) {
    return NextResponse.json({ error: "Group owner not found" }, { status: 404 })
  }

  // If groupId provided, verify it belongs to the owner
  if (groupId) {
    const group = await prisma.telegramGroup.findFirst({
      where: {
        id: groupId,
        userId: groupOwnerId,
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found or doesn't belong to owner" }, { status: 404 })
    }
  }

  const creditRequest = await prisma.creditRequest.create({
    data: {
      userId: session.user.id,
      groupOwnerId,
      groupId: groupId || null,
      amount,
      reason: reason || null,
      status: "PENDING",
    },
  })

  return NextResponse.json({
    success: true,
    request: creditRequest,
    message: "Credit request submitted to group owner",
  })
}
