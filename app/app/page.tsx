"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import CreditRequestModal from "@/components/app/CreditRequestModal"

type Stats = {
  credits: number
  groupsCount: number
  verifiedGroupsCount: number
  postsCount: number
  scheduledPostsCount: number
  sentPostsCount: number
  totalRevenue: number
  totalSpent: number
  subscriptionTier: string
  subscriptionStatus: string
}

export default function AppPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats>({
    credits: 0,
    groupsCount: 0,
    verifiedGroupsCount: 0,
    postsCount: 0,
    scheduledPostsCount: 0,
    sentPostsCount: 0,
    totalRevenue: 0,
    totalSpent: 0,
    subscriptionTier: "FREE",
    subscriptionStatus: "ACTIVE",
  })
  const [loading, setLoading] = useState(true)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [pendingCreditRequests, setPendingCreditRequests] = useState(0)

  useEffect(() => {
    // Wait for session status to be determined before loading stats
    if (status === "loading") {
      return // Still loading, don't do anything
    }
    if (session?.user) {
      loadStats()
    } else if (status === "unauthenticated") {
      setLoading(false) // User is not authenticated, stop loading
    }
  }, [session, status])

  const loadStats = async () => {
    try {
      const [creditsRes, groupsRes, postsRes, creditRequestsRes] = await Promise.all([
        fetch("/api/credits/balance", { credentials: "include" }),
        fetch("/api/groups", { credentials: "include" }),
        fetch("/api/posts", { credentials: "include" }),
        fetch("/api/groups/credit-requests?status=PENDING", { credentials: "include" }),
      ])

      const credits = creditsRes.ok ? (await creditsRes.json()).credits || 0 : 0
      const groups = groupsRes.ok ? (await groupsRes.json()).groups || [] : []
      const posts = postsRes.ok ? (await postsRes.json()).posts || [] : []

      // Calculate revenue and spent from posts
      const paidPosts = posts.filter((p: any) => p.isPaidAd && p.creditsPaid)
      const totalSpent = paidPosts.reduce((sum: number, p: any) => sum + (p.creditsPaid || 0), 0)
      
      // Calculate revenue from groups (totalRevenue field)
      const totalRevenue = groups.reduce((sum: number, g: any) => sum + (g.totalRevenue || 0), 0)

      // Get pending credit requests count
      const creditRequestsData = creditRequestsRes.ok ? await creditRequestsRes.json() : { pendingCount: 0 }
      setPendingCreditRequests(creditRequestsData.pendingCount || 0)

      setStats({
        credits,
        groupsCount: groups.length,
        verifiedGroupsCount: groups.filter((g: any) => g.isVerified).length,
        postsCount: posts.length,
        scheduledPostsCount: posts.filter((p: any) => p.status === "SCHEDULED").length,
        sentPostsCount: posts.filter((p: any) => p.status === "SENT").length,
        totalRevenue,
        totalSpent,
        subscriptionTier: "FREE", // Will be fetched separately if needed
        subscriptionStatus: "ACTIVE", // Will be fetched separately if needed
      })
    } catch (error) {
      console.error("Failed to load stats", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestCredits = async (amount: number, reason?: string, groupOwnerId?: string, groupId?: string) => {
    try {
      if (!groupOwnerId) {
        throw new Error("Please select a group owner")
      }
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
        loadStats()
        return Promise.resolve()
      } else {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit request")
      }
    } catch (error: any) {
      throw new Error(error.message || "An error occurred")
    }
  }

  // Show loading state while session is being checked
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show "sign in" message if we're sure user is not authenticated
  if (status === "unauthenticated" || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔐</div>
          <p className="text-gray-600 mb-2">Please sign in</p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Regular users should see different interface
  if (session.user.role === "USER") {
    return (
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {session.user.name || session.user.telegramUsername || "User"}!</h1>
              <p className="mt-2 text-blue-100">
                Post ads in Telegram groups managed by publishers.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="rounded-full bg-white/20 p-4 text-4xl">📢</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-3xl">💳</span>
              </div>
              <div className="text-3xl font-bold">{loading ? "..." : stats.credits.toLocaleString()}</div>
              <div className="mt-1 text-sm font-medium text-white/90">Credits</div>
              <div className="mt-1 text-xs text-white/70">Available balance</div>
            </div>
          </div>
          <Link href="/app/posts" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-3xl">📝</span>
                <svg className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="text-3xl font-bold">{loading ? "..." : stats.postsCount}</div>
              <div className="mt-1 text-sm font-medium text-white/90">My Posts</div>
              <div className="mt-1 text-xs text-white/70">{stats.scheduledPostsCount} scheduled</div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/app/groups"
            className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-blue-50 p-3 group-hover:bg-blue-100 transition-colors">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20H2m15 0v-2c0-.656-.126-1.283-.356-1.857M2 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">My Groups</div>
                <div className="mt-1 text-sm text-gray-500">View your groups and groups you've posted in</div>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/dashboard/groups"
            className="group flex items-center justify-between rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-lg hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-purple-100 p-3 group-hover:bg-purple-200 transition-colors">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-purple-900">Manage Groups</div>
                <div className="mt-1 text-sm text-purple-600">Add and manage your groups (subscription required for posting more than 3 posts)</div>
              </div>
            </div>
            <svg className="h-5 w-5 text-purple-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Credits",
      value: loading ? "..." : stats.credits.toLocaleString(),
      subtitle: "Available balance",
      icon: "💳",
      color: "from-blue-500 to-blue-600",
      href: null,
    },
    {
      title: "Groups",
      value: loading ? "..." : `${stats.verifiedGroupsCount}/${stats.groupsCount}`,
      subtitle: "Verified groups",
      icon: "👥",
      color: "from-purple-500 to-purple-600",
      href: "/app/groups",
    },
    {
      title: "Posts",
      value: loading ? "..." : stats.postsCount,
      subtitle: `${stats.scheduledPostsCount} scheduled, ${stats.sentPostsCount} sent`,
      icon: "📝",
      color: "from-green-500 to-green-600",
      href: "/app/posts",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="mt-2 text-blue-100">
              Manage your Telegram groups and schedule posts with ease.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="rounded-full bg-white/20 backdrop-blur-sm p-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        {pendingCreditRequests > 0 && (
          <div className="relative z-10 mt-4">
            <Link
              href="/dashboard/credit-requests"
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/30 hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingCreditRequests} Pending Credit Request{pendingCreditRequests > 1 ? 's' : ''}
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => {
          const content = (
            <div
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-6 text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-white/20 backdrop-blur-sm p-3">
                    {card.icon}
                  </div>
                  {card.href && (
                    <svg
                      className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="text-3xl font-bold">{card.value}</div>
                <div className="mt-1 text-sm font-medium text-white/90">{card.title}</div>
                <div className="mt-1 text-xs text-white/70">{card.subtitle}</div>
              </div>
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10"></div>
            </div>
          )

          return card.href ? (
            <Link key={card.title} href={card.href}>
              {content}
            </Link>
          ) : (
            <div key={card.title}>{content}</div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Credits Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Credits Balance</h2>
              <p className="mt-1 text-sm text-gray-500">Request credits from admin</p>
            </div>
            <div className="text-4xl">💳</div>
          </div>
          <div className="mt-6">
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "..." : stats.credits.toLocaleString()}
            </div>
            <p className="mt-2 text-sm text-gray-500">Available credits</p>
          </div>
          <button
            onClick={() => setShowCreditModal(true)}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
          >
            Request Credits
          </button>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-6 space-y-3">
            <Link
              href="/app/groups"
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="flex items-center space-x-2">
                <span>👥</span>
                <span>Manage Groups</span>
              </span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/app/posts"
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            >
              <span className="flex items-center space-x-2">
                <span>📝</span>
                <span>Schedule Posts</span>
              </span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {session.user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 transition-all hover:border-purple-300 hover:bg-purple-100"
              >
                <span className="flex items-center space-x-2">
                  <span>⚙️</span>
                  <span>Admin Dashboard</span>
                </span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        currentCredits={stats.credits}
      />
    </div>
  )
}

