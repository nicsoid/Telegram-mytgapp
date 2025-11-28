import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import PostsManager from "@/components/publisher/PostsManager"

export default async function PostsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Dashboard pages require active subscription - handled by layout

  return <PostsManager />
}

