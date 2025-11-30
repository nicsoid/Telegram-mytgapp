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
  const [showAuthError, setShowAuthError] = useState(false)

  useEffect(() => {
    // Always fetch groups (public listing)
    fetchGroups()
    
    // Only fetch credits if authenticated
    if (session?.user) {
      fetchCredits()
    } else {
      setLoading(false)
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

  const handleRequestCredits = async (amount: number, reason?: string, groupOwnerId?: string, groupId?: string) => {
    if (!groupOwnerId) {
      throw new Error("Please select a group owner to request credits from")
    }
    try {
      const res = await fetch("/api/credits/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          reason,
          groupOwnerId,
          groupId,
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

  // Show loading state while checking authentication
  // Give auto-auth time to complete (up to 8 seconds)
  const [authTimeout, setAuthTimeout] = useState(false)
  
  useEffect(() => {
    const isInTelegram = typeof window !== "undefined" && (window as any).Telegram?.WebApp
    if (status === "loading" || (status === "unauthenticated" && isInTelegram)) {
      const timer = setTimeout(() => {
        // Check session outside the closure to avoid TypeScript issues
        if (status === "unauthenticated" || !session || !(session as any).user) {
          setAuthTimeout(true)
          setShowAuthError(true)
        }
      }, 8000)
      return () => clearTimeout(timer)
    } else {
      setAuthTimeout(false)
      setShowAuthError(false)
    }
  }, [status, session])

  // Check if we're in Telegram WebApp
  const isInTelegram = typeof window !== "undefined" && (window as any).Telegram?.WebApp
  
  // Don't block page - always show groups (public listing)
  // Show authentication status as banner if needed

  const displayName = session?.user ? (() => {
    const name = session.user.name
    const telegramUsername = session.user.telegramUsername
    const email = session.user.email
    
    if (name && telegramUsername) {
      return `${name} (@${telegramUsername})`
    }
    if (telegramUsername) {
      return `@${telegramUsername}`
    }
    return name || email || "Member"
  })() : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MyTgApp</h1>
              {displayName ? (
                <p className="mt-1 text-sm text-gray-600">Signed in as {displayName}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Browse available groups</p>
              )}
            </div>
            {/* Role badge removed - all users are equal */}
          </div>
        </div>
      </div>

      {/* Authentication Status Banner */}
      {!session?.user && isInTelegram && (
        <div className="mx-4 mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">⏳</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                {status === "loading" ? "Authenticating..." : "Sign in to post"}
              </p>
              <p className="text-xs text-blue-800 mt-1">
                {status === "loading" 
                  ? "Please wait while we sign you in automatically" 
                  : "You can browse groups, but need to sign in to schedule posts"}
              </p>
            </div>
            {status === "unauthenticated" && (
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-6 space-y-6">
        {/* Credits Balance - Only show if authenticated */}
        {session?.user && (
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
        )}

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
                <div
                  key={group.id}
                  className={`block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
                    !session?.user ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  }`}
                  onClick={() => {
                    if (session?.user) {
                      window.location.href = `/app/posts/new?groupId=${group.id}`
                    }
                  }}
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
                        <span>Price: <span className="font-semibold text-blue-600">{group.pricePerPost === 0 ? 'FREE' : `${group.pricePerPost} credits`}</span></span>
                        {group.isVerified && (
                          <span className="inline-flex items-center text-green-600">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      {!session?.user && (
                        <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 p-2">
                          <p className="text-xs text-yellow-800">
                            ⚠️ Sign in to schedule posts in this group
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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

        {/* Quick Actions - Only show if authenticated */}
        {session?.user && (
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

              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <div className="font-semibold text-indigo-900">Manage Groups</div>
                    <div className="text-xs text-indigo-600">Add groups and post ads (subscription required)</div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
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

