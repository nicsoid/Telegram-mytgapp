import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import GroupsManager from "@/components/publisher/GroupsManager"

export default async function GroupsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Dashboard pages require active subscription - handled by layout

  return <GroupsManager />
}

