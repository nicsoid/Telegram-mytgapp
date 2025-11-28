"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type User = {
  id: string
  name: string | null
  email: string | null
  telegramUsername: string | null
  telegramId: string | null
  telegramVerifiedAt: Date | null
  role: string
  credits: number
  createdAt: Date
  subscriptionTier: string
  subscriptionStatus: string
  isVerified: boolean
  groups: Array<{
    id: string
    name: string
    username: string | null
    isVerified: boolean
    isActive: boolean
    pricePerPost: number | null
  }>
  subscriptions: Array<{
    id: string
    tier: string
    status: string
    createdAt: Date
    // tierConfig removed - not a relation
  }>
  advertiserPosts: Array<{
    id: string
    content: string
                    scheduledAt: Date
    status: string
    group: {
      id: string
      name: string
      username: string | null
    }
  }>
  creditTransactions: Array<{
    id: string
    amount: number
    type: string
    description: string | null
    createdAt: Date
    relatedGroupId: string | null
  }>
  _count: {
    advertiserPosts: number
    creditTransactions: number
  }
}

export default function UserDetails({ user: initialUser }: { user: User }) {
  const router = useRouter()
  const [user, setUser] = useState<User>(initialUser)
  const [loading, setLoading] = useState(false)

  const fetchUser = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Failed to fetch user", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
                <p className="mt-2 text-sm text-gray-600">View user information and activity</p>
              </div>
            </div>
            <button
              onClick={fetchUser}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* User Info Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg font-bold text-gray-900">User Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Name</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">{user.name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Email</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">{user.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Telegram</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.telegramUsername ? `@${user.telegramUsername}` : "N/A"}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Role</label>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      user.role === "ADMIN" 
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.role}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Credits</label>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{user.credits.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Member Since</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription & Groups Info */}
        {(user.groups.length > 0 || user.subscriptionTier !== "FREE") && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <h2 className="text-lg font-bold text-gray-900">Subscription & Groups</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Subscription Tier</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.subscriptionTier.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      user.subscriptionStatus === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.subscriptionStatus}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Verified</label>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      user.isVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {user.isVerified ? "Yes" : "No"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Groups */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Groups ({user.groups.length})</h3>
                {user.groups.length === 0 ? (
                  <p className="text-sm text-gray-500">No groups</p>
                ) : (
                  <div className="space-y-2">
                    {user.groups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{group.name}</p>
                          <p className="text-xs text-gray-500">@{group.username || "N/A"}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {group.isVerified && (
                            <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-800">
                              Verified
                            </span>
                          )}
                          {group.pricePerPost && (
                            <span className="text-xs text-gray-600">{group.pricePerPost} credits</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h2 className="text-lg font-bold text-gray-900">Recent Posts ({user._count.advertiserPosts} total)</h2>
          </div>
          <div className="p-6">
            {user.advertiserPosts.length === 0 ? (
              <p className="text-sm text-gray-500">No posts</p>
            ) : (
              <div className="space-y-3">
                {user.advertiserPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{post.group.name}</p>
                        <p className="text-xs text-gray-500">@{post.group.username || "N/A"}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        post.status === "SENT"
                          ? "bg-green-100 text-green-800"
                          : post.status === "SCHEDULED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                    {post.scheduledAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Credit Transactions */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50">
            <h2 className="text-lg font-bold text-gray-900">Recent Transactions ({user._count.creditTransactions} total)</h2>
          </div>
          <div className="p-6">
            {user.creditTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions</p>
            ) : (
              <div className="space-y-2">
                {user.creditTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {tx.type.replace("_", " ")}
                        {tx.relatedGroupId && ` (Group: ${tx.relatedGroupId})`}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-gray-500">{tx.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${
                      tx.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

