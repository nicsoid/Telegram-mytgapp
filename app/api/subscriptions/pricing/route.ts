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

    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID
    const revenueSharePriceId = process.env.STRIPE_REVENUE_SHARE_PRICE_ID

    const pricing: any = {
      monthly: null,
      revenueShare: null,
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

    // Fetch revenue share plan pricing (if it's a paid subscription)
    // Note: Revenue share might not have a Stripe price if it's just a percentage
    if (revenueSharePriceId) {
      try {
        const price = await stripe.prices.retrieve(revenueSharePriceId)
        pricing.revenueShare = {
          id: price.id,
          amount: price.unit_amount ? price.unit_amount / 100 : 0,
          currency: price.currency || "usd",
          interval: price.recurring?.interval || "month",
        }
      } catch (error: any) {
        // If revenue share price doesn't exist or API key is invalid, skip it
        // Revenue share is typically just a percentage, not a Stripe price
        console.error("Failed to fetch revenue share price:", error?.message || error)
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

    // Revenue share percent from env (if not in Stripe)
    // Revenue share is typically not a Stripe price, but a percentage
    const revenueSharePercent = parseFloat(process.env.REVENUE_SHARE_PERCENT || "20")
    if (pricing.revenueShare) {
      pricing.revenueShare.percent = revenueSharePercent
    } else {
      pricing.revenueShare = {
        percent: revenueSharePercent,
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

