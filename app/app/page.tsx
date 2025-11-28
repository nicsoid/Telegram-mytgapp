"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function AppPage() {
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

  const handleRequestCredits = async (publisherId?: string) => {
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
          publisherId, // Request from specific publisher if provided
        }),
      })

      if (res.ok) {
        alert(
          publisherId
            ? "Credit request submitted to publisher!"
            : "Credit request submitted to admin!"
        )
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
      <div className="flex min-h-screen items-center justify-center">
        <p>Please sign in</p>
      </div>
    )
  }

  const displayName =
    session.user.name ||
    session.user.telegramUsername ||
    session.user.email ||
    "Member"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs text-gray-500">MyTgApp</p>
            <h1 className="text-2xl font-semibold text-gray-900">Welcome, {displayName}</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/app"
              className="rounded-full px-4 py-2 font-medium text-blue-600 hover:bg-blue-50"
            >
              Overview
            </Link>
            <Link
              href="/app/posts"
              className="rounded-full px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              Posts
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full px-4 py-2 text-gray-500 hover:text-gray-900"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Credits Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Credits</h2>
            <div className="mt-4">
              <div className="text-3xl font-bold text-gray-900">
                {loading ? "..." : credits}
              </div>
              <p className="mt-2 text-sm text-gray-500">Available credits</p>
            </div>
            <div className="mt-6 space-y-2">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleRequestCredits()
                }}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Request Credits from Admin
              </button>
              <p className="text-xs text-gray-500 text-center">
                You can also request credits from publishers who manage groups you want to post in
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link
                href="/app/posts"
                className="block rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                View My Posts
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleRequestCredits()
                }}
                className="block w-full rounded bg-gray-100 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Request Credits from Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

