import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const rejectSchema = z.object({
  reason: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminSession()
  if ("response" in guard) return guard.response

  const { id } = await params
  const body = await request.json()
  const { reason } = rejectSchema.parse(body)

  const creditRequest = await prisma.creditRequest.findUnique({
    where: { id },
  })

  if (!creditRequest) {
    return NextResponse.json({ error: "Credit request not found" }, { status: 404 })
  }

  if (creditRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Credit request already processed" },
      { status: 400 }
    )
  }

  await prisma.creditRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      processedBy: guard.session.user.id,
      processedAt: new Date(),
      notes: reason,
    },
  })

  return NextResponse.json({ success: true, message: "Credit request rejected" })
}

