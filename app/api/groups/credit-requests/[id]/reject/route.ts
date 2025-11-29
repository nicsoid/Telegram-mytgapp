import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const rejectSchema = z.object({
  reason: z.string().optional(),
})

// Reject credit request (no subscription required - any group owner can reject)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { reason } = rejectSchema.parse(body)

  // Get the credit request
  const creditRequest = await prisma.creditRequest.findUnique({
    where: { id },
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

  // Reject the request
  await prisma.creditRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      processedBy: session.user.id,
      processedAt: new Date(),
      notes: reason || undefined,
    },
  })

  return NextResponse.json({ success: true })
}

