import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client"

const updateSubscriptionSchema = z.object({
  subscriptionTier: z.enum(["FREE", "MONTHLY"]).optional(), // Only FREE and MONTHLY allowed
  subscriptionStatus: z.nativeEnum(SubscriptionStatus).optional(),
  subscriptionExpiresAt: z.string().datetime().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const data = updateSubscriptionSchema.parse(body)

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user subscription
    const updateData: any = {}
    if (data.subscriptionTier !== undefined) {
      updateData.subscriptionTier = data.subscriptionTier
    }
    if (data.subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = data.subscriptionStatus
    }
    if (data.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = data.subscriptionExpiresAt
        ? new Date(data.subscriptionExpiresAt)
        : null
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        telegramUsername: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Error updating subscription:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}

