import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { z } from "zod"

const checkoutSchema = z.object({
  tier: z.enum(["FREE", "MONTHLY"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

// Stripe Price IDs for subscription tiers
// Support both naming conventions for backward compatibility
const SUBSCRIPTION_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.SUBSCRIPTION_STRIPE_PRICE_ID || "",
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
        { error: "Stripe not configured. Please check STRIPE_SECRET_KEY in environment variables." },
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
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        })
        if (customers.data.length > 0) {
          customerId = customers.data[0].id
        }
      } catch (error: any) {
        console.error("Failed to list customers:", error?.message || error)
        if (error?.type === 'StripeAuthenticationError') {
          return NextResponse.json(
            { 
              error: "Invalid Stripe API key. Please check STRIPE_SECRET_KEY in your environment variables.",
              details: "The Stripe secret key appears to be invalid. Verify it in your Stripe Dashboard and ensure it matches your test/live mode."
            },
            { status: 500 }
          )
        }
        throw error
      }
    }

    // Create customer if not found
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          name: user?.name || undefined,
          metadata: {
            userId: user.id,
          },
        })
        customerId = customer.id
      } catch (error: any) {
        console.error("Failed to create customer:", error?.message || error)
        if (error?.type === 'StripeAuthenticationError') {
          return NextResponse.json(
            { 
              error: "Invalid Stripe API key. Please check STRIPE_SECRET_KEY in your environment variables.",
              details: "The Stripe secret key appears to be invalid. Verify it in your Stripe Dashboard."
            },
            { status: 500 }
          )
        }
        throw error
      }
    }

    // Create checkout session
    let checkoutSession
    try {
      console.log(`Creating checkout session for tier: ${tier}, priceId: ${priceId}, customerId: ${customerId}`)
      checkoutSession = await stripe.checkout.sessions.create({
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
      console.log(`✅ Checkout session created: ${checkoutSession.id}`)
    } catch (stripeError: any) {
      console.error("Stripe checkout session creation error:", {
        type: stripeError?.type,
        code: stripeError?.code,
        message: stripeError?.message,
        param: stripeError?.param,
      })
      
      // Provide more helpful error message
      if (stripeError?.type === 'StripeAuthenticationError') {
        return NextResponse.json(
          { 
            error: "Invalid Stripe API key. Please check STRIPE_SECRET_KEY in your environment variables.",
            details: "The Stripe secret key appears to be invalid or incorrect. Make sure it starts with 'sk_test_' for test mode or 'sk_live_' for live mode, and that it matches the mode of your price IDs.",
            debug: {
              keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + "...",
              priceId: priceId,
              tier: tier,
            }
          },
          { status: 500 }
        )
      }
      if (stripeError?.code === 'resource_missing' && stripeError?.param === 'price') {
        return NextResponse.json(
          { 
            error: `Price ID not found: ${priceId}. Please check your STRIPE_MONTHLY_PRICE_ID or SUBSCRIPTION_STRIPE_PRICE_ID in environment variables.`,
            details: "The Stripe price ID does not exist or is incorrect. Verify it in your Stripe Dashboard and ensure it matches your test/live mode.",
            debug: {
              priceId: priceId,
              tier: tier,
            }
          },
          { status: 400 }
        )
      }
      // Re-throw other errors to be caught by outer catch
      throw stripeError
    }

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

