import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { z } from "zod"

const purchaseSchema = z.object({
  credits: z.number().int().min(1).max(1000),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

const CREDIT_PRICE_EUR = parseFloat(process.env.CREDIT_PRICE_EUR || "2.0")
const CREDIT_STRIPE_PRICE_ID = process.env.CREDIT_STRIPE_PRICE_ID

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { credits, successUrl, cancelUrl } = purchaseSchema.parse(body)

    if (!stripe || !CREDIT_STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: "Credit pricing not configured" },
        { status: 500 }
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
        },
      })
      customerId = customer.id
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price: CREDIT_STRIPE_PRICE_ID,
          quantity: credits,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: "credit_purchase",
        userId: session.user.id,
        credits: credits.toString(),
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error("Credit purchase error:", error)
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

