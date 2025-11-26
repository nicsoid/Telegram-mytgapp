import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const creditSchema = z.object({
  amount: z.number().int(),
  reason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requireAdminSession()
  if ("response" in guard) return guard.response

  const { userId } = await params
  const body = await request.json()
  const { amount, reason } = creditSchema.parse(body)

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    // Update user credits
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
        type: "ADMIN_GRANT",
        description: reason || `Credits granted by admin ${guard.session.user.id}`,
      },
    })
  })

  return NextResponse.json({ success: true, message: `Credits updated successfully` })
}

