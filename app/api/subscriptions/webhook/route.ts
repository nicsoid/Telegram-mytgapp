import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata

        if (metadata?.type === "credit_purchase") {
          const userId = metadata.userId
          const credits = parseInt(metadata.credits || "0", 10)

          if (userId && credits > 0) {
            await prisma.$transaction(async (tx) => {
              // Add credits to user
              await tx.user.update({
                where: { id: userId },
                data: {
                  credits: { increment: credits },
                },
              })

              // Create transaction record
              await tx.creditTransaction.create({
                data: {
                  userId,
                  amount: credits,
                  type: "PURCHASE",
                  description: `Purchased ${credits} credits via Stripe (session: ${session.id})`,
                },
              })
            })
          }
        } else if (metadata?.type === "subscription") {
          const publisherId = metadata.publisherId
          const tier = metadata.tier

          if (publisherId && tier && session.subscription) {
            // Fetch subscription details from Stripe
            const subscription = (await stripe.subscriptions.retrieve(session.subscription as string)) as any

            // Update publisher subscription tier
            await prisma.publisher.update({
              where: { id: publisherId },
              data: {
                subscriptionTier: tier as any,
                subscriptionStatus: subscription.status === "active" ? "ACTIVE" : "CANCELED",
                subscriptionExpiresAt: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000)
                  : null,
              },
            })

            // Create or update subscription record
            await prisma.subscription.upsert({
              where: {
                publisherId_tier: {
                  publisherId,
                  tier: tier as any,
                },
              },
              create: {
                publisherId,
                tier: tier as any,
                status: subscription.status === "active" ? "ACTIVE" : "CANCELED",
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
                currentPeriodStart: subscription.current_period_start
                  ? new Date(subscription.current_period_start * 1000)
                  : null,
                currentPeriodEnd: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000)
                  : null,
              },
              update: {
                status: subscription.status === "active" ? "ACTIVE" : "CANCELED",
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
                currentPeriodStart: subscription.current_period_start
                  ? new Date(subscription.current_period_start * 1000)
                  : null,
                currentPeriodEnd: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000)
                  : null,
              },
            })
          }
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        const subscriptionId = subscription.id

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: subscription.status === "active" ? "ACTIVE" : "CANCELED",
            currentPeriodStart: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000)
              : null,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

