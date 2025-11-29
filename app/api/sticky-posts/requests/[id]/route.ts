import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "FULFILLED"]).optional(),
  notes: z.string().optional(),
})

// Get a specific sticky post request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const stickyRequest = await prisma.stickyPostRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            username: true,
            stickyPostPrice: true,
          },
        },
        groupOwner: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        },
      },
    })

    if (!stickyRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Verify user has access (either the requester or the group owner)
    if (
      stickyRequest.userId !== session.user.id &&
      stickyRequest.groupOwnerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ request: stickyRequest })
  } catch (error) {
    console.error("Error fetching sticky post request:", error)
    return NextResponse.json(
      { error: "Failed to fetch sticky post request" },
      { status: 500 }
    )
  }
}

// Update sticky post request (approve, reject, or mark as fulfilled)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, notes } = updateRequestSchema.parse(body)

    const stickyRequest = await prisma.stickyPostRequest.findUnique({
      where: { id },
    })

    if (!stickyRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Only group owner can approve/reject/fulfill
    if (stickyRequest.groupOwnerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Can't change status if already fulfilled
    if (stickyRequest.status === "FULFILLED") {
      return NextResponse.json(
        { error: "Request is already fulfilled" },
        { status: 400 }
      )
    }

    const updateData: any = {
      processedBy: session.user.id,
      processedAt: new Date(),
    }

    if (status) {
      updateData.status = status
      if (status === "FULFILLED") {
        updateData.fulfilledAt = new Date()
      }
    }

    if (notes) {
      updateData.notes = notes
    }

    // If rejecting, refund credits
    if (status === "REJECTED") {
      await prisma.$transaction(async (tx) => {
        // Refund credits
        await tx.user.update({
          where: { id: stickyRequest.userId },
          data: {
            credits: { increment: stickyRequest.creditsPaid },
          },
        })

        // Create refund transaction
        await tx.creditTransaction.create({
          data: {
            userId: stickyRequest.userId,
            amount: stickyRequest.creditsPaid,
            type: "EARNED",
            relatedGroupId: stickyRequest.groupId,
            description: `Refund for rejected sticky post request in group: ${stickyRequest.groupId}`,
          },
        })

        // Update request
        await tx.stickyPostRequest.update({
          where: { id },
          data: updateData,
        })
      })
    } else {
      // Just update the request
      await prisma.stickyPostRequest.update({
        where: { id },
        data: updateData,
      })
    }

    const updatedRequest = await prisma.stickyPostRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            telegramUsername: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: `Request ${status?.toLowerCase() || "updated"} successfully`,
    })
  } catch (error) {
    console.error("Error updating sticky post request:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update sticky post request" },
      { status: 500 }
    )
  }
}

