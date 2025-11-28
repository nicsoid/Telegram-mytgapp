"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

type TelegramGroup = {
  id: string
  name: string
  username: string | null
  description: string | null
  pricePerPost: number
  isVerified: boolean
  verifiedAt: string | null
  totalPostsScheduled: number
  totalPostsSent: number
}

type AdvertisedGroup = {
  id: string
  name: string
  username: string | null
  pricePerPost: number
  isVerified: boolean
  postCount: number
}

export default function MyGroupsPage() {
  const { data: session, status } = useSession()
  const [myGroups, setMyGroups] = useState<TelegramGroup[]>([])
  const [advertisedGroups, setAdvertisedGroups] = useState<AdvertisedGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadGroups()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [session, status])

  const loadGroups = async () => {
    setLoading(true)
    try {
      // Load user's own groups
      const groupsRes = await fetch("/api/groups", { credentials: "include" })
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setMyGroups(groupsData.groups || [])
      }

      // Load groups where user has posted as advertiser
      const postsRes = await fetch("/api/posts", { credentials: "include" })
      if (postsRes.ok) {
        const postsData = await postsRes.json()
        const posts = postsData.posts || []
        
        // Get unique groups where user is advertiser
        const advertisedGroupsMap = new Map<string, { group: any; count: number }>()
        posts.forEach((post: any) => {
          if (post.advertiserId === session?.user?.id && post.group) {
            const groupId = post.group.id
            if (!advertisedGroupsMap.has(groupId)) {
              advertisedGroupsMap.set(groupId, {
                group: post.group,
                count: 0,
              })
            }
            advertisedGroupsMap.get(groupId)!.count++
          }
        })

        const advertised: AdvertisedGroup[] = Array.from(advertisedGroupsMap.values()).map((item) => ({
          id: item.group.id,
          name: item.group.name,
          username: item.group.username || null,
          pricePerPost: item.group.pricePerPost || 0,
          isVerified: item.group.isVerified || false,
          postCount: item.count,
        }))

        setAdvertisedGroups(advertised)
      }
    } catch (error) {
      console.error("Failed to load groups", error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while session is being checked
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Please sign in to view your groups.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your groups and view groups where you've posted ads.
        </p>
      </div>

      {/* My Groups Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Groups I Own</h2>
          <Link
            href="/dashboard/groups"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Manage Groups
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-sm font-medium text-gray-900">Loading groups...</p>
          </div>
        ) : myGroups.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-sm font-medium text-gray-900">No groups yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Add your first group to get started
            </p>
            <Link
              href="/dashboard/groups"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Add Group
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myGroups.map((group) => (
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
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-gray-500">Scheduled</div>
                      <div className="font-semibold text-gray-900">{group.totalPostsScheduled}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-gray-500">Sent</div>
                      <div className="font-semibold text-gray-900">{group.totalPostsSent}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-xs font-medium text-gray-700">Price per post</span>
                    <span className="text-lg font-bold text-blue-600">{group.pricePerPost} credits</span>
                  </div>
                  <Link
                    href={`/dashboard/groups`}
                    className="block w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Groups I've Posted In Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Groups I've Posted In</h2>

        {loading ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-sm font-medium text-gray-900">Loading...</p>
          </div>
        ) : advertisedGroups.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-sm font-medium text-gray-900">No posts in other groups yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Browse groups and post ads to see them here
            </p>
            <Link
              href="/app/posts"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Create Post
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {advertisedGroups.map((group) => (
              <div
                key={group.id}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{group.name}</h3>
                        {group.username && (
                          <p className="text-xs text-gray-500">@{group.username}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {group.isVerified && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg bg-purple-50 p-3">
                    <div className="text-xs text-gray-500">Your Posts</div>
                    <div className="text-lg font-bold text-purple-600">{group.postCount}</div>
                  </div>
                  {group.pricePerPost > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <span className="text-xs font-medium text-gray-700">Price per post</span>
                      <span className="text-lg font-bold text-blue-600">{group.pricePerPost} credits</span>
                    </div>
                  )}
                  <Link
                    href={`/app/posts?groupId=${group.id}`}
                    className="block w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-md"
                  >
                    View Posts
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
