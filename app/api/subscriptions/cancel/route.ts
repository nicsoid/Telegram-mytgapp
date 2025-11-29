import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

// Cancel user's subscription
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's active subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const activeSubscription = user.subscriptions[0]

    if (!activeSubscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      )
    }

    // If subscription has Stripe subscription ID, cancel it in Stripe
    if (activeSubscription.stripeSubscriptionId && stripe) {
      try {
        // Cancel at period end (subscription remains active until period ends)
        await stripe.subscriptions.update(activeSubscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        })
        
        // Fetch updated subscription from Stripe to get current status
        const stripeSubscription = await stripe.subscriptions.retrieve(activeSubscription.stripeSubscriptionId) as any
        
        // Update subscription with latest info from Stripe
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            status: stripeSubscription.status === "active" ? "ACTIVE" : "CANCELED",
            currentPeriodStart: stripeSubscription.current_period_start
              ? new Date(stripeSubscription.current_period_start * 1000)
              : null,
            currentPeriodEnd: stripeSubscription.current_period_end
              ? new Date(stripeSubscription.current_period_end * 1000)
              : null,
          },
        })
        
        // Update user's subscription status - keep ACTIVE if cancel_at_period_end is set
        // The subscription will remain active until the period ends
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            subscriptionStatus: stripeSubscription.cancel_at_period_end ? "ACTIVE" : "CANCELED",
            subscriptionExpiresAt: stripeSubscription.current_period_end
              ? new Date(stripeSubscription.current_period_end * 1000)
              : null,
          },
        })
      } catch (error: any) {
        console.error("Failed to cancel Stripe subscription:", error)
        // If Stripe update fails, still mark as canceled in database
        await prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            status: "CANCELED",
          },
        })
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            subscriptionStatus: "CANCELED",
          },
        })
      }
    } else {
      // No Stripe subscription, just cancel in database
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: "CANCELED",
        },
      })
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          subscriptionStatus: "CANCELED",
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully. It will remain active until the end of the current billing period.",
    })
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}

