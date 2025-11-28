import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PublisherDashboard from "@/components/publisher/PublisherDashboard"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Check if user has active subscription (required for dashboard access)
  // Defensive query - try with subscription fields, fallback if migration not applied
  let user: any
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        subscriptions: {
          where: {
            status: "ACTIVE",
            tier: { not: "FREE" },
          },
        },
      },
    })
  } catch (error: any) {
    // If subscription columns don't exist yet, fetch without them
    if (error?.code === 'P2022' || error?.message?.includes('does not exist')) {
      console.warn('[dashboard] Subscription columns not yet migrated, fetching without subscription fields')
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          subscriptions: {
            where: {
              status: "ACTIVE",
              tier: { not: "FREE" },
            },
          },
        },
      })
      // Add default values
      if (user) {
        user = {
          ...user,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiresAt: null,
        }
      }
    } else {
      throw error
    }
  }

  const hasActiveSubscription = (user?.subscriptions && user.subscriptions.length > 0) || 
    (user?.subscriptionStatus === "ACTIVE" && user?.subscriptionTier !== "FREE")

  if (!hasActiveSubscription) {
    redirect("/app?subscription_required=true")
  }

  return <PublisherDashboard />
}

