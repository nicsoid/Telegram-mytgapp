import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import LandingPage from "@/components/LandingPage"

export default async function HomePage() {
  const session = await auth()

  // Show landing page if not logged in
  if (!session) {
    return <LandingPage />
  }

  // Redirect based on role
  if (session.user?.role === "ADMIN") {
    redirect("/admin")
  } else if (session.user?.role === "PUBLISHER") {
    redirect("/dashboard")
  } else {
    redirect("/app")
  }
}

