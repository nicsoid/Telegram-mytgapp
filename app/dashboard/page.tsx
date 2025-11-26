import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import PublisherDashboard from "@/components/publisher/PublisherDashboard"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "PUBLISHER") {
    redirect("/")
  }

  return <PublisherDashboard />
}

