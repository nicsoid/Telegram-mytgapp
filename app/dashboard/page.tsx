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
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscriptions: {
        where: {
          status: "ACTIVE",
          tier: { not: "FREE" },
        },
      },
    },
  })

  const hasActiveSubscription = (user?.subscriptions && user.subscriptions.length > 0) || 
    (user?.subscriptionStatus === "ACTIVE" && user?.subscriptionTier !== "FREE")

  if (!hasActiveSubscription) {
    redirect("/app?subscription_required=true")
  }

  return <PublisherDashboard />
}

