"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import CreditRequestModal from "@/components/app/CreditRequestModal"

export default function TelegramMiniAppPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchCredits()
      fetchGroups()
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

  const fetchGroups = async () => {
    setGroupsLoading(true)
    try {
      const res = await fetch("/api/groups/browse", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch (error) {
      console.error("Failed to fetch groups", error)
    } finally {
      setGroupsLoading(false)
    }
  }

  const handleRequestCredits = async (amount: number, reason?: string, publisherId?: string) => {
    if (!publisherId) {
      throw new Error("Please select a publisher to request credits from")
    }
    try {
      const res = await fetch("/api/credits/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          reason,
          publisherId,
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

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔐</div>
          <p className="text-gray-600 mb-4">Please sign in with Telegram</p>
          <p className="text-sm text-gray-500">If you're in Telegram, authentication should happen automatically</p>
        </div>
      </div>
    )
  }

  const displayName = session.user.name || session.user.telegramUsername || session.user.email || "Member"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MyTgApp</h1>
              <p className="mt-1 text-sm text-gray-600">Signed in as {displayName}</p>
            </div>
            {session.user.role === "PUBLISHER" && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                Publisher
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Credits Balance */}
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credits Balance</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">
                {loading ? "..." : credits.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowCreditModal(true)}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
            >
              Request Credits
            </button>
          </div>
        </div>

        {/* Browse Groups Section */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Browse Groups</h2>
          {groupsLoading ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-sm text-gray-600">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-sm font-medium text-gray-900">No groups available</p>
              <p className="mt-1 text-xs text-gray-500">Publishers haven't added any groups yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.slice(0, 5).map((group) => (
                <Link
                  key={group.id}
                  href={`/app/posts/new?groupId=${group.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-sm">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{group.name}</h3>
                          {group.username && (
                            <p className="text-xs text-gray-500">@{group.username}</p>
                          )}
                        </div>
                      </div>
                      {group.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{group.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Price: <span className="font-semibold text-blue-600">{group.pricePerPost} credits</span></span>
                        {group.isVerified && (
                          <span className="inline-flex items-center text-green-600">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {groups.length > 5 && (
                <Link
                  href="/app/groups"
                  className="block rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm font-medium text-gray-700 transition-all hover:border-blue-300 hover:bg-blue-50"
                >
                  View All {groups.length} Groups →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/app/posts"
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📝</div>
                <div>
                  <div className="font-semibold text-gray-900">My Posts</div>
                  <div className="text-xs text-gray-500">View and manage your posts</div>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {session.user.role === "PUBLISHER" ? (
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <div className="font-semibold text-purple-900">Publisher Dashboard</div>
                    <div className="text-xs text-purple-600">Manage groups and posts</div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/auth/publisher/signup"
                className="flex items-center justify-between rounded-xl border border-gradient-to-r from-purple-200 to-indigo-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 shadow-sm transition-all hover:from-purple-100 hover:to-indigo-100 hover:shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🚀</div>
                  <div>
                    <div className="font-semibold text-purple-900">Become a Publisher</div>
                    <div className="text-xs text-purple-600">Add groups and post ads to your groups</div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
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

