"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

type Publisher = {
  id: string
  subscriptionTier: string
  subscriptionStatus: string
  telegramVerified: boolean
  emailVerified: boolean
  isVerified: boolean
  totalEarnings: number
  totalSpent: number
  user: {
    id: string
    name: string | null
    email: string | null
    telegramUsername: string | null
    credits: number
  }
  groups: Array<{
    id: string
    name: string
    isVerified: boolean
    isActive: boolean
    totalPostsScheduled: number
    totalPostsSent: number
    totalRevenue: number
  }>
  _count: {
    groups: number
    posts: number
    managedUsers: number
  }
}

export default function PublisherDashboard() {
  const { data: session } = useSession()
  const [publisher, setPublisher] = useState<Publisher | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublisher()
  }, [])

  const fetchPublisher = async () => {
    try {
      const res = await fetch("/api/publishers/me", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setPublisher(data.publisher)
      }
    } catch (error) {
      console.error("Failed to fetch publisher", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!publisher) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Publisher profile not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Publisher Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your Telegram groups and posts</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Verification Status */}
        {!publisher.isVerified && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-800">Complete Verification</h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>✓ Telegram: {publisher.telegramVerified ? "Verified" : "Not Verified"}</p>
              <p>✓ Email: {publisher.emailVerified ? "Verified" : "Not Verified"}</p>
              {!publisher.emailVerified && (
                <Link href="/dashboard/verify-email" className="mt-2 inline-block text-blue-600 hover:text-blue-700">
                  Verify Email →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Credits</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{publisher.user.credits}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Groups</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{publisher._count.groups}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Earnings</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{publisher.totalEarnings}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Managed Users</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{publisher._count.managedUsers}</dd>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Link
            href="/dashboard/groups"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Manage Groups
          </Link>
          <Link
            href="/dashboard/posts"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Schedule Posts
          </Link>
          <Link
            href="/dashboard/users"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Manage Users
          </Link>
          <Link
            href="/dashboard/credit-requests"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Credit Requests
          </Link>
        </div>

        {/* Groups List */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Your Groups</h3>
            {publisher.groups.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No groups yet. Add your first group to get started.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {publisher.groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{group.name}</div>
                      <div className="mt-1 text-sm text-gray-500">
                        {group.isVerified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-amber-600">⚠ Not Verified</span>
                        )}
                        {" • "}
                        {group.totalPostsScheduled} scheduled, {group.totalPostsSent} sent
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/groups/${group.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Manage →
                    </Link>
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

