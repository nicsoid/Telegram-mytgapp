import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import UsersManager from "@/components/publisher/UsersManager"

export default async function UsersPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Dashboard pages require active subscription - handled by layout

  return <UsersManager />
}

