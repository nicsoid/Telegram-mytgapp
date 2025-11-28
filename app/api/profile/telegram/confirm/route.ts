import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const confirmSchema = z.object({
  code: z.string().min(4).max(32),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code } = confirmSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        telegramVerificationCode: true,
        telegramVerificationExpires: true,
        telegramVerificationTelegramId: true,
        telegramVerificationTelegramUsername: true,
        telegramVerifiedAt: true,
        telegramId: true,
        telegramUsername: true,
        emailVerified: true,
      },
    })

    if (
      !user?.telegramVerificationCode ||
      !user.telegramVerificationExpires ||
      user.telegramVerificationCode !== code
    ) {
      return NextResponse.json({ error: "Invalid or missing verification code" }, { status: 400 })
    }

    if (user.telegramVerificationExpires.getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification code expired" }, { status: 400 })
    }

    if (!user.telegramVerificationTelegramId) {
      return NextResponse.json(
        { error: "Telegram bot confirmation missing. Tap the verification link and send the code to the bot first." },
        { status: 400 }
      )
    }

    const updates: any = {
      telegramVerificationCode: null,
      telegramVerificationExpires: null,
      telegramVerificationTelegramId: null,
      telegramVerificationTelegramUsername: null,
      telegramVerifiedAt: new Date(),
    }

    if (!user.telegramId) {
      updates.telegramId = user.telegramVerificationTelegramId
    }
    if (user.telegramVerificationTelegramUsername) {
      updates.telegramUsername = user.telegramVerificationTelegramUsername
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: updates,
      })

      // Update user verification status directly
      const isFullyVerified = user.emailVerified !== null
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          telegramVerified: true,
          isVerified: isFullyVerified,
        },
      })
    })

    return NextResponse.json({ success: true, verifiedAt: updates.telegramVerifiedAt.toISOString() })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 })
    }
    console.error("Telegram confirm error", error)
    return NextResponse.json({ error: "Failed to confirm verification" }, { status: 500 })
  }
}

