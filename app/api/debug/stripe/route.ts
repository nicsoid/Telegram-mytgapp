import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

// Debug endpoint to test Stripe configuration
// Only accessible in development or with proper auth
export async function GET(request: NextRequest) {
  // In production, you might want to add auth check here
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  const debugInfo: any = {
    stripeConfigured: !!stripe,
    stripeSecretKeySet: !!process.env.STRIPE_SECRET_KEY,
    stripeSecretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + "...",
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || "Not set",
    revenueSharePriceId: process.env.STRIPE_REVENUE_SHARE_PRICE_ID || "Not set",
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
  }

  // Test Stripe API if configured
  if (stripe && process.env.STRIPE_MONTHLY_PRICE_ID) {
    try {
      const price = await stripe.prices.retrieve(process.env.STRIPE_MONTHLY_PRICE_ID)
      debugInfo.monthlyPriceTest = {
        success: true,
        id: price.id,
        amount: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
      }
    } catch (error: any) {
      debugInfo.monthlyPriceTest = {
        success: false,
        error: error?.message || "Unknown error",
        type: error?.type,
        code: error?.code,
      }
    }
  }

  // Test customer list (simple API call)
  if (stripe) {
    try {
      const customers = await stripe.customers.list({ limit: 1 })
      debugInfo.stripeApiTest = {
        success: true,
        message: "Stripe API is working",
      }
    } catch (error: any) {
      debugInfo.stripeApiTest = {
        success: false,
        error: error?.message || "Unknown error",
        type: error?.type,
        code: error?.code,
        statusCode: error?.statusCode,
      }
    }
  }

  return NextResponse.json(debugInfo)
}

