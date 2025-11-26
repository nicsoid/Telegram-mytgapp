import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const requestSchema = z.object({
  amount: z.number().int().min(1).max(10000),
  reason: z.string().optional(),
  publisherId: z.string().optional(), // Optional: request from specific publisher
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { amount, reason, publisherId } = requestSchema.parse(body)

  // If publisherId is provided, verify publisher exists
  if (publisherId) {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
    })

    if (!publisher) {
      return NextResponse.json({ error: "Publisher not found" }, { status: 404 })
    }
  }

  const creditRequest = await prisma.creditRequest.create({
    data: {
      userId: session.user.id,
      publisherId: publisherId || null,
      amount,
      reason: reason || null,
      status: "PENDING",
    },
  })

  return NextResponse.json({
    success: true,
    request: creditRequest,
    message: publisherId
      ? "Credit request submitted to publisher"
      : "Credit request submitted to admin",
  })
}
