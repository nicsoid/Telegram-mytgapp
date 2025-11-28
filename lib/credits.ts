import { prisma } from "@/lib/prisma"

/**
 * Get user's credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })
  return user?.credits ?? 0
}

/**
 * Add credits to user
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: "PURCHASE" | "EARNED" | "PUBLISHER_GRANT",
  description?: string,
  relatedPostId?: string,
  relatedGroupId?: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
      },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description: description || `Credits added: ${type}`,
        relatedPostId: relatedPostId || null,
        relatedGroupId: relatedGroupId || null,
      },
    })
  })
}

/**
 * Deduct credits from user
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description?: string,
  relatedPostId?: string,
  relatedGroupId?: string
) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user || user.credits < amount) {
      throw new Error("Insufficient credits")
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: amount },
      },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "SPENT",
        description: description || `Credits spent`,
        relatedPostId: relatedPostId || null,
        relatedGroupId: relatedGroupId || null,
      },
    })
  })
}

