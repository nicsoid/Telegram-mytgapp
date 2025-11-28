import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramVerifiedAt: true,
      telegramVerificationCode: true,
      telegramVerificationExpires: true,
      telegramVerificationTelegramUsername: true,
      telegramUsername: true,
    },
  })

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "mytgappbot"
  const response = {
    verifiedAt: user?.telegramVerifiedAt?.toISOString() ?? null,
    code: user?.telegramVerificationCode ?? null,
    expiresAt: user?.telegramVerificationExpires?.toISOString() ?? null,
    botUsername,
    deepLink:
      user?.telegramVerificationCode != null
        ? `https://t.me/${botUsername}?start=${user.telegramVerificationCode}`
        : null,
    telegramUsername: user?.telegramUsername ?? null,
    pendingUsername: user?.telegramVerificationTelegramUsername ?? null,
  }

  return NextResponse.json(response)
}

