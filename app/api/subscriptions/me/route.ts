import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get current user's subscription status
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      subscriptions: {
        // Get the most recent subscription (active or canceled)
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Check Stripe for cancel_at_period_end if subscription has Stripe ID
  let cancelAtPeriodEnd = false
  const subscription = user.subscriptions[0]
  
  if (subscription?.stripeSubscriptionId) {
    try {
      const { stripe } = await import("@/lib/stripe")
      if (stripe) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId) as any
        cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end || false
      }
    } catch (error) {
      console.error("Failed to fetch Stripe subscription details:", error)
      // Continue without Stripe data
    }
  }

  return NextResponse.json({
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    activeSubscription: subscription ? {
      ...subscription,
      cancelAtPeriodEnd,
    } : null,
  })
}

