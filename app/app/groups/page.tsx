"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"

type TelegramGroup = {
  id: string
  name: string
  username: string | null
  description: string | null
  pricePerPost: number
  isVerified: boolean
  publisher: {
    user: {
      name: string | null
      telegramUsername: string | null
    }
  }
}

export default function BrowseGroupsPage() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<TelegramGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (session?.user) {
      loadGroups()
    }
  }, [session])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/groups/browse", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch (error) {
      console.error("Failed to load groups", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter((group) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      group.name.toLowerCase().includes(searchLower) ||
      group.username?.toLowerCase().includes(searchLower) ||
      group.description?.toLowerCase().includes(searchLower)
    )
  })

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Please sign in to browse groups.
      </div>
    )
  }

  // If user is a publisher, redirect to publisher groups page
  if (session.user.role === "PUBLISHER") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You are a publisher. Manage your groups from the publisher dashboard.</p>
          <Link
            href="/dashboard/groups"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
          >
            Go to Publisher Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Groups</h1>
          <p className="mt-2 text-sm text-gray-600">
            Find groups to post your ads. Request credits from publishers to post in their groups.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups by name, username, or description..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-sm font-medium text-gray-900">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-sm font-medium text-gray-900">No groups found</p>
            <p className="mt-1 text-xs text-gray-500">
              {search ? "Try adjusting your search" : "No groups available yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{group.name}</h3>
                        {group.username && (
                          <p className="text-xs text-gray-500">@{group.username}</p>
                        )}
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{group.description}</p>
                    )}
                  </div>
                  {group.isVerified && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-xs font-medium text-gray-700">Price per post</span>
                    <span className="text-lg font-bold text-blue-600">{group.pricePerPost} credits</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Publisher: {group.publisher.user.name || group.publisher.user.telegramUsername || "Unknown"}
                  </div>

                  <Link
                    href={`/app/posts/new?groupId=${group.id}`}
                    className="block w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
                  >
                    Post Ad Here
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
