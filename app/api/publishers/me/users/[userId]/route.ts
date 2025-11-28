import { NextRequest, NextResponse } from "next/server"
import { requireActiveSubscription } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requireActiveSubscription()
  if ("response" in guard) return guard.response

  const { userId } = await params

  // No managed users anymore - users are automatically tracked via credit requests
  // This endpoint is kept for backward compatibility but does nothing
  return NextResponse.json({ success: true, message: "User management removed - users are tracked via credit requests" })

  return NextResponse.json({ success: true, message: "User removed from managed list" })
}

