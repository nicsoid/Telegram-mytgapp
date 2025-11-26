import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import PublishersManager from "@/components/admin/PublishersManager"

export default async function AdminPublishersPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/")
  }

  return <PublishersManager />
}

