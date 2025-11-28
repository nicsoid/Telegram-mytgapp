import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { z } from "zod"

const checkoutSchema = z.object({
  tier: z.enum(["FREE", "MONTHLY", "REVENUE_SHARE"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

// Stripe Price IDs for subscription tiers
const SUBSCRIPTION_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || "",
  REVENUE_SHARE: process.env.STRIPE_REVENUE_SHARE_PRICE_ID || "",
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // All users can subscribe (no role restriction)

    const body = await request.json()
    const { tier, successUrl, cancelUrl } = checkoutSchema.parse(body)

    // FREE tier doesn't require payment
    if (tier === "FREE") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          subscriptionTier: "FREE",
          subscriptionStatus: "ACTIVE",
        },
      })

      return NextResponse.json({
        success: true,
        message: "Free tier activated",
        url: successUrl,
      })
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      )
    }

    const priceId = SUBSCRIPTION_PRICE_IDS[tier]
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for tier: ${tier}` },
        { status: 500 }
      )
    }

    // Get user (all users can subscribe now)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    let customerId: string | null = null

    // Try to find existing customer
    if (user?.email) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })
      if (customers.data.length > 0) {
        customerId = customers.data[0].id
      }
    }

    // Create customer if not found
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        name: user?.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: "subscription",
        userId: user.id,
        tier,
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error("Subscription checkout error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}

