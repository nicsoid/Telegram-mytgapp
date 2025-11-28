import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const code = crypto.randomBytes(4).toString("hex").toUpperCase()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramVerificationCode: code,
      telegramVerificationExpires: expiresAt,
      telegramVerificationTelegramId: null,
      telegramVerificationTelegramUsername: null,
      telegramVerifiedAt: null,
    },
  })

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "mytgappbot"
  const deepLink = `https://t.me/${botUsername}?start=${code}`

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    botUsername,
    deepLink,
    instructions: [
      "Tap the button below to open Telegram and send the code to the bot.",
      "Make sure the bot can read your username (set it in Telegram settings if needed).",
      "Return here and press “Confirm verification”.",
    ],
  })
}

