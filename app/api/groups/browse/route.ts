import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all verified, active groups that are available for posting
  const groups = await prisma.telegramGroup.findMany({
    where: {
      isVerified: true,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          telegramUsername: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
          subscriptions: {
            where: {
              status: "ACTIVE",
              tier: { not: "FREE" },
            },
            select: { id: true, tier: true },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Add subscription status to each group
  const groupsWithSubscription = groups.map((group) => {
    const user = group.user
    const hasActiveSubscription = user.subscriptions.length > 0 ||
                                  (user.subscriptionStatus === "ACTIVE" &&
                                   user.subscriptionTier !== "FREE" &&
                                   (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date()))
    
    return {
      ...group,
      ownerHasActiveSubscription: hasActiveSubscription,
    }
  })

  return NextResponse.json({ groups: groupsWithSubscription })
}

