import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import CreditRequestsManager from "@/components/publisher/CreditRequestsManager"

export default async function CreditRequestsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Dashboard pages require active subscription - handled by layout

  return <CreditRequestsManager />
}

