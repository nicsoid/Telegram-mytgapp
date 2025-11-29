"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function NewPostPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupId = searchParams.get("groupId")

  useEffect(() => {
    // Redirect to main posts page with groupId parameter
    if (groupId) {
      router.replace(`/app/posts?groupId=${groupId}`)
    } else {
      router.replace("/app/posts")
    }
  }, [groupId, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">⏳</div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}

export default function NewPostPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <NewPostPageContent />
    </Suspense>
  )
}

