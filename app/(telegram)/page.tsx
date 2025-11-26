"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function TelegramMiniAppPage() {
  const { data: session } = useSession()
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

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

  const handleRequestCredits = async () => {
    const amount = prompt("How many credits would you like to request?")
    if (!amount || isNaN(parseInt(amount))) return

    const reason = prompt("Reason (optional):") || undefined

    try {
      const res = await fetch("/api/credits/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseInt(amount),
          reason,
        }),
      })

      if (res.ok) {
        alert("Credit request submitted successfully!")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to submit request")
      }
    } catch (error) {
      alert("An error occurred")
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
              onClick={handleRequestCredits}
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
    </div>
  )
}

