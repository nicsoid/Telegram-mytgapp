"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import CreditRequestModal from "@/components/app/CreditRequestModal"

export default function TelegramMiniAppPage() {
  const { data: session } = useSession()
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreditModal, setShowCreditModal] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchCredits()
    }
  }, [session])

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/credits/balance", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setCredits(data.credits || 0)
      }
    } catch (error) {
      console.error("Failed to fetch credits", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestCredits = async (amount: number, reason?: string) => {
    try {
      const res = await fetch("/api/credits/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          reason,
        }),
      })

      if (res.ok) {
        fetchCredits()
        return Promise.resolve()
      } else {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit request")
      }
    } catch (error: any) {
      throw new Error(error.message || "An error occurred")
    }
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50">
        <div className="text-center">
          <p className="text-gray-600">Please sign in with Telegram</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">MyTgApp</h1>
          <p className="mt-1 text-sm text-gray-600">Telegram Mini App</p>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="mb-6 rounded-lg border border-blue-200 bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Credits Balance</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {loading ? "..." : credits}
              </p>
            </div>
            <button
              onClick={() => setShowCreditModal(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Request Credits
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/app/posts"
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow"
          >
            <div className="font-semibold text-gray-900">My Posts</div>
            <div className="mt-1 text-sm text-gray-500">View and manage your posts</div>
          </Link>

          {session.user.role === "PUBLISHER" && (
            <>
              <Link
                href="/dashboard"
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow"
              >
                <div className="font-semibold text-gray-900">Publisher Dashboard</div>
                <div className="mt-1 text-sm text-gray-500">Manage groups and posts</div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Credit Request Modal */}
      <CreditRequestModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onSubmit={handleRequestCredits}
        currentCredits={credits}
      />
    </div>
  )
}

