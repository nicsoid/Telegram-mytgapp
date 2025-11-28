import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isChatAdmin } from "@/lib/telegram"
import { z } from "zod"

const verifySchema = z.object({
  chatId: z.string(),
  userId: z.string(),
  code: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, userId, code } = verifySchema.parse(body)

    // Find group by chat ID and verification code
    const group = await prisma.telegramGroup.findFirst({
      where: {
        telegramChatId: chatId,
        verificationCode: code.toUpperCase(),
      },
      include: {
        user: true,
      },
    })

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

    // Verify user is admin in the group
    const userIsAdmin = await isChatAdmin(chatId, userId)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "You must be an admin in the group to verify it" },
        { status: 403 }
      )
    }

    // Update group as verified
    await prisma.telegramGroup.update({
      where: { id: group.id },
      data: {
        isVerified: true,
        verifiedByBot: true,
        verifiedAt: new Date(),
        verificationCode: null, // Clear code after verification
      },
    })

    return NextResponse.json({
      success: true,
      message: "Group verified successfully",
    })
  } catch (error) {
    console.error("Group verification error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to verify group" },
      { status: 500 }
    )
  }
}

