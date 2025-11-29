import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

// Get subscription pricing information from Stripe
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      )
    }

    // Support both naming conventions for backward compatibility
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID || process.env.SUBSCRIPTION_STRIPE_PRICE_ID

    const pricing: any = {
      monthly: null,
    }

    // Fetch monthly plan pricing
    if (monthlyPriceId) {
      try {
        const price = await stripe.prices.retrieve(monthlyPriceId)
        pricing.monthly = {
          id: price.id,
          amount: price.unit_amount ? price.unit_amount / 100 : 0, // Convert from cents
          currency: price.currency || "usd",
          interval: price.recurring?.interval || "month",
        }
      } catch (error: any) {
        // Log error but don't fail - use fallback
        console.error("Failed to fetch monthly price from Stripe:", error?.message || error)
        // If it's an authentication error, the API key is likely wrong
        if (error?.type === 'StripeAuthenticationError') {
          console.error("⚠️ Stripe API key appears to be invalid. Check STRIPE_SECRET_KEY in .env")
        }
      }
    }

    // If prices couldn't be fetched, use fallback values from env
    if (!pricing.monthly) {
      const fallbackAmount = parseFloat(process.env.MONTHLY_SUBSCRIPTION_PRICE || process.env.STRIPE_MONTHLY_PRICE || "9.99")
      pricing.monthly = {
        amount: fallbackAmount,
        currency: "usd",
        interval: "month",
      }
    }

    return NextResponse.json({ pricing })
  } catch (error) {
    console.error("Error fetching pricing:", error)
    return NextResponse.json(
      { error: "Failed to fetch pricing information" },
      { status: 500 }
    )
  }
}

