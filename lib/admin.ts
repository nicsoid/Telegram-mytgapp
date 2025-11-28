import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function requireAdminSession() {
  const session = await auth()
  
  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  if (session.user.role !== "ADMIN") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { session }
}

// Check if user has active subscription (required for adding groups)
export async function requireActiveSubscription() {
  const session = await auth()
  
  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  // Get user with subscription info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscriptions: {
        where: {
          status: "ACTIVE",
          tier: { not: "FREE" }, // FREE tier doesn't count for adding groups
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!user) {
    return {
      response: NextResponse.json({ error: "User not found" }, { status: 404 }),
    }
  }

  // Check if user has active subscription (not FREE tier)
  const hasActiveSubscription = user.subscriptions.length > 0 || 
    (user.subscriptionStatus === "ACTIVE" && user.subscriptionTier !== "FREE")

  if (!hasActiveSubscription) {
    return {
      response: NextResponse.json(
        { 
          error: "Active subscription required",
          message: "You need an active subscription to add groups. Please subscribe to continue.",
        },
        { status: 403 }
      ),
    }
  }

  return { session, user }
}

// Legacy function name for backward compatibility during migration
export async function requirePublisherSession() {
  return requireActiveSubscription()
}


