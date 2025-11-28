import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import { getTelegramChat } from "@/lib/telegram"

const createGroupSchema = z.object({
  telegramChatId: z.string().optional(), // Optional - will be set during verification
  name: z.string().min(1).max(200).optional(), // Optional - can be fetched from Telegram
  username: z.string().min(1), // Required - username or link
  description: z.string().optional(),
  pricePerPost: z.number().int().min(0).default(1),
  freePostIntervalDays: z.number().int().min(1).max(365).default(7),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const groups = await prisma.telegramGroup.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user with Telegram verification status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      telegramVerifiedAt: true,
      telegramVerified: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Check if user has verified Telegram
  if (!user.telegramVerifiedAt && !user.telegramVerified) {
    return NextResponse.json(
      { error: "Please verify your Telegram account before adding groups" },
      { status: 403 }
    )
  }

  return handleGroupCreation(user, request)
}

async function handleGroupCreation(user: any, request: NextRequest) {
  const body = await request.json()
  const data = createGroupSchema.parse(body)

  // Parse username from link if provided (t.me/username or @username)
  let cleanUsername = data.username
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?t\.me\//, '')
    .replace(/^t\.me\//, '')
    .trim()

  if (!cleanUsername) {
    return NextResponse.json(
      { error: "Invalid username or link format" },
      { status: 400 }
    )
  }

  // Try to get chat info from Telegram API
  let chatInfo: { chatId: string; title: string; username: string; type: string; description?: string } | null = null
  try {
    chatInfo = await getTelegramChat(cleanUsername)
    cleanUsername = chatInfo.username
  } catch (error: any) {
    // If we can't get chat info, that's okay - user might need to add bot first
    console.warn("Could not fetch chat info from Telegram:", error.message)
  }

  // Check if group with same username already exists
  const existingByUsername = await prisma.telegramGroup.findFirst({
    where: {
      username: cleanUsername,
      userId: user.id,
    },
  })

  if (existingByUsername) {
    return NextResponse.json(
      { error: "A group with this username already exists" },
      { status: 400 }
    )
  }

  // If chat ID was fetched, check if it exists
  if (chatInfo?.chatId) {
    const existingByChatId = await prisma.telegramGroup.findFirst({
      where: { telegramChatId: chatInfo.chatId },
    })

    if (existingByChatId) {
      return NextResponse.json(
        { error: "This group is already registered in the system" },
        { status: 400 }
      )
    }
  }

  // Generate verification code
  const verificationCode = crypto.randomBytes(8).toString("hex").toUpperCase()

  // Use fetched name from Telegram or provided name
  const groupName = data.name || chatInfo?.title || cleanUsername

  const group = await prisma.telegramGroup.create({
    data: {
      userId: user.id,
      telegramChatId: chatInfo?.chatId || null, // Set if available, otherwise will be set during verification
      name: groupName,
      username: cleanUsername,
      description: data.description || chatInfo?.description || null,
      pricePerPost: data.pricePerPost,
      freePostIntervalDays: data.freePostIntervalDays,
      verificationCode,
      isVerified: false,
    },
  })

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || "igramposter_bot"
  
  return NextResponse.json({
    success: true,
    group,
    verificationCode,
    message: `Group added! Add the bot (@${botUsername}) to your group as admin, then send /verify ${verificationCode} in the group. The chat ID will be automatically detected during verification.`,
  })
}

