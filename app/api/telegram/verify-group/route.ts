import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isChatAdmin } from "@/lib/telegram"
import { z } from "zod"

const verifySchema = z.object({
  chatId: z.string().optional(), // Optional - can be set during verification
  userId: z.string(),
  code: z.string(),
  groupId: z.string().optional(), // Optional - can use groupId instead of chatId
})

export async function POST(request: NextRequest) {
  try {
    // Get session to ensure user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { chatId, userId, code, groupId } = verifySchema.parse(body)

    // Ensure userId matches session user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 })
    }

    // Find group by verification code and userId (owner)
    // If groupId is provided, use it; otherwise find by code
    let group
    if (groupId) {
      group = await prisma.telegramGroup.findFirst({
        where: {
          id: groupId,
          userId: userId,
          verificationCode: code.toUpperCase(),
        },
        include: {
          user: true,
        },
      })
    } else {
      // Find by verification code and user
      group = await prisma.telegramGroup.findFirst({
        where: {
          userId: userId,
          verificationCode: code.toUpperCase(),
          ...(chatId ? { telegramChatId: chatId } : {}),
        },
        include: {
          user: true,
        },
      })
    }

    if (!group) {
      return NextResponse.json(
        { error: "Group not found or invalid verification code" },
        { status: 404 }
      )
    }

    // Verify user is the group owner
    if (group.userId !== userId) {
      return NextResponse.json(
        { error: "You are not the owner of this group" },
        { status: 403 }
      )
    }

    // If chatId is provided, verify user is admin in the group
    if (chatId) {
      const userIsAdmin = await isChatAdmin(chatId, userId)
      if (!userIsAdmin) {
        return NextResponse.json(
          { error: "You must be an admin in the group to verify it" },
          { status: 403 }
        )
      }
    }

    // Update group as verified
    // If chatId is provided and group doesn't have one, set it
    const updateData: any = {
      isVerified: true,
      verifiedByBot: true,
      verifiedAt: new Date(),
      verificationCode: null, // Clear code after verification
    }
    
    if (chatId && !group.telegramChatId) {
      updateData.telegramChatId = chatId
    }

    await prisma.telegramGroup.update({
      where: { id: group.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: "Group verified successfully",
    })
  } catch (error) {
    console.error("Group verification error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: error.issues 
      }, { status: 400 })
    }
    // Log more details for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Verification error details:", {
      errorMessage,
      error,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: "Failed to verify group",
        message: errorMessage 
      },
      { status: 500 }
    )
  }
}

