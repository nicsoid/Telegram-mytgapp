import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const { userId } = await params

  await prisma.publisherManagedUser.delete({
    where: {
      publisherId_userId: {
        publisherId: guard.publisher.id,
        userId,
      },
    },
  })

  return NextResponse.json({ success: true, message: "User removed from managed list" })
}

