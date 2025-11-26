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

    if (session.user.role !== "PUBLISHER") {
      return NextResponse.json({ error: "Only publishers can subscribe" }, { status: 403 })
    }

    const body = await request.json()
    const { tier, successUrl, cancelUrl } = checkoutSchema.parse(body)

    // FREE tier doesn't require payment
    if (tier === "FREE") {
      const publisher = await prisma.publisher.findUnique({
        where: { userId: session.user.id },
      })

      if (publisher) {
        await prisma.publisher.update({
          where: { id: publisher.id },
          data: {
            subscriptionTier: "FREE",
            subscriptionStatus: "ACTIVE",
          },
        })
      }

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

    // Get or create publisher
    let publisher = await prisma.publisher.findUnique({
      where: { userId: session.user.id },
    })

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher profile not found" },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    })

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
          userId: session.user.id,
          publisherId: publisher.id,
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
        publisherId: publisher.id,
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

