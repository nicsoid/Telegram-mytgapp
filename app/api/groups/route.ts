import { NextRequest, NextResponse } from "next/server"
import { requirePublisherSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"

const createGroupSchema = z.object({
  telegramChatId: z.string().optional(), // Optional - will be set during verification
  name: z.string().min(1).max(200),
  username: z.string().optional(),
  description: z.string().optional(),
  pricePerPost: z.number().int().min(0).default(1),
  freePostIntervalDays: z.number().int().min(1).max(365).default(7),
})

export async function GET(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  const groups = await prisma.telegramGroup.findMany({
    where: { publisherId: guard.publisher.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const guard = await requirePublisherSession()
  if ("response" in guard) return guard.response

  // Check if publisher is verified
  if (!guard.publisher.isVerified) {
    return NextResponse.json(
      { error: "Please verify both your Telegram account and email before adding groups" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const data = createGroupSchema.parse(body)

  // If chat ID is provided, check if group already exists
  if (data.telegramChatId) {
    const existing = await prisma.telegramGroup.findFirst({
      where: { telegramChatId: data.telegramChatId },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Group already exists in the system" },
        { status: 400 }
      )
    }
  }

  // Check if group with same username already exists (if username provided)
  if (data.username) {
    const existingByUsername = await prisma.telegramGroup.findFirst({
      where: {
        username: data.username,
        publisherId: guard.publisher.id,
      },
    })

    if (existingByUsername) {
      return NextResponse.json(
        { error: "A group with this username already exists" },
        { status: 400 }
      )
    }
  }

  // Generate verification code
  const verificationCode = crypto.randomBytes(8).toString("hex").toUpperCase()

  const group = await prisma.telegramGroup.create({
    data: {
      publisherId: guard.publisher.id,
      telegramChatId: data.telegramChatId || null, // Will be set during verification
      name: data.name,
      username: data.username || null,
      description: data.description || null,
      pricePerPost: data.pricePerPost,
      freePostIntervalDays: data.freePostIntervalDays,
      verificationCode,
      isVerified: false,
    },
  })

  return NextResponse.json({
    success: true,
    group,
    verificationCode,
    message: `Group added! Add the bot to your group as admin, then send /verify ${verificationCode} in the group. The chat ID will be automatically detected during verification.`,
  })
}

