import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"

const verifyEmailSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email } = verifyEmailSchema.parse(body)

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date()
    expires.setHours(expires.getHours() + 24) // 24 hours

    // Update user email and create verification token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { email },
      })

      await tx.verificationToken.upsert({
        where: {
          identifier_token: {
            identifier: email,
            token,
          },
        },
        create: {
          identifier: email,
          token,
          expires,
        },
        update: {
          token,
          expires,
        },
      })
    })

    // TODO: Send verification email
    // For now, we'll auto-verify for development
    // In production, send email with verification link

    // Auto-verify for now (remove in production)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailVerified: new Date(),
        isVerified: true, // Both Telegram and email verified
      },
    })

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      // In production, return: { success: true, message: "Verification email sent" }
    })
  } catch (error) {
    console.error("Email verification error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    )
  }
}

