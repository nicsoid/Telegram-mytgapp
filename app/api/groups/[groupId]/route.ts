import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateGroupSchema = z.object({
  pricePerPost: z.number().int().min(0).optional(),
  freePostIntervalDays: z.number().int().min(1).max(365).optional(),
  advertiserMessage: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const body = await request.json()
    const data = updateGroupSchema.parse(body)

    // Verify group exists and user owns it
    const group = await prisma.telegramGroup.findUnique({
      where: { id: groupId },
      select: { userId: true },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update group - only include fields that exist
    const updateData: any = {}
    if (data.pricePerPost !== undefined) updateData.pricePerPost = data.pricePerPost
    if (data.freePostIntervalDays !== undefined) updateData.freePostIntervalDays = data.freePostIntervalDays
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    
    // Only include advertiserMessage if provided (field may not exist if migration not applied)
    if (data.advertiserMessage !== undefined) {
      // Try to include it, but catch error if field doesn't exist
      updateData.advertiserMessage = data.advertiserMessage
    }

    try {
      const updatedGroup = await prisma.telegramGroup.update({
        where: { id: groupId },
        data: updateData,
      })
      return NextResponse.json({ group: updatedGroup })
    } catch (error: any) {
      // If advertiserMessage field doesn't exist, retry without it
      if (error?.message?.includes("advertiserMessage") || error?.code === "P2009") {
        console.warn("advertiserMessage field not available, updating without it")
        delete updateData.advertiserMessage
        const updatedGroup = await prisma.telegramGroup.update({
          where: { id: groupId },
          data: updateData,
        })
        return NextResponse.json({ group: updatedGroup })
      }
      throw error
    }
  } catch (error) {
    console.error("Error updating group:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    )
  }
}

