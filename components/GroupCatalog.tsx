"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import CreditRequestModal from "@/components/app/CreditRequestModal"

type Group = {
  id: string
  name: string
  username: string | null
  description: string | null
  pricePerPost: number
  isVerified: boolean
  advertiserMessage: string | null
  ownerHasActiveSubscription: boolean
  stickyPostsEnabled: boolean
  stickyPostPrice: number | null
  stickyPostPeriodDays: number | null
  user: {
    id: string
    name: string | null
    telegramUsername: string | null
  }
}

export default function GroupCatalog() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  useEffect(() => {
    loadGroups()
  }, [])

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

  const handleRequestCredits = async (amount: number, reason?: string, groupOwnerId?: string, groupId?: string) => {
    try {
      if (!groupOwnerId) {
        throw new Error("Group owner is required")
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
        return Promise.resolve()
      } else {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit request")
      }
    } catch (error: any) {
      throw new Error(error.message || "An error occurred")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading groups...</div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <div className="text-4xl mb-4">👥</div>
        <p className="text-sm font-medium text-gray-900">No groups available yet</p>
        <p className="mt-1 text-xs text-gray-500">Group owners need to add and verify their groups first</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div
            key={group.id}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-lg">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{group.name}</h3>
                      {group.ownerHasActiveSubscription && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800" title="Group owner has active subscription - posts can be scheduled">
                          ✓ Active
                        </span>
                      )}
                    </div>
                    {group.username && (
                      <p className="text-sm text-gray-500">@{group.username}</p>
                    )}
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{group.description}</p>
                )}
                {!group.ownerHasActiveSubscription && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 mb-3">
                    <p className="text-xs font-medium text-yellow-900">
                      ⚠️ Group owner subscription inactive - posts cannot be scheduled at this time
                    </p>
                  </div>
                )}
                {group.advertiserMessage && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3">
                    <p className="text-xs font-medium text-blue-900 mb-1">Message from Owner:</p>
                    <p className="text-xs text-blue-800 whitespace-pre-wrap">{group.advertiserMessage}</p>
                  </div>
                )}
              </div>
              {group.isVerified && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                  ✓ Verified
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Price per post:</span>
                {group.pricePerPost === 0 ? (
                  <span className="font-bold text-green-600">FREE</span>
                ) : (
                  <span className="font-bold text-blue-600">{group.pricePerPost} credits</span>
                )}
              </div>
              {group.pricePerPost === 0 && (group as any).freePostIntervalDays && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-700 font-medium">⏱️ Quiet period:</span>
                    <span className="text-green-900 font-semibold">{(group as any).freePostIntervalDays} days</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    You can schedule posts with at least {(group as any).freePostIntervalDays} days between them
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Owner: {group.user.name || group.user.telegramUsername || "Unknown"}</span>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 mt-2">
                <p className="text-xs text-blue-700">
                  💡 Credits from this owner can be used for <strong>all their groups</strong>
                </p>
              </div>

              {group.stickyPostsEnabled && group.stickyPostPrice && (
                <div className="mb-3 rounded-lg bg-purple-50 border border-purple-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-900 mb-1">📌 Sticky Posts Available</p>
                      <p className="text-xs text-purple-700">
                        {group.stickyPostPrice} credits/day
                        {group.stickyPostPeriodDays && ` (default: ${group.stickyPostPeriodDays} days)`}
                      </p>
                    </div>
                    <Link
                      href={`/app/sticky-posts/request?groupId=${group.id}`}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition-colors"
                    >
                      Request Sticky
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {session?.user ? (
                  <>
                    <Link
                      href={`/app/posts/new?groupId=${group.id}`}
                      className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold shadow-sm transition-all ${
                        group.ownerHasActiveSubscription
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={(e) => {
                        if (!group.ownerHasActiveSubscription) {
                          e.preventDefault()
                          alert("This group's owner does not have an active subscription. Posts cannot be scheduled to this group at this time.")
                        }
                      }}
                    >
                      {group.ownerHasActiveSubscription ? "Post Ad" : "Subscription Required"}
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedGroup(group)
                        setShowCreditModal(true)
                      }}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100"
                      title="Request credits from group owner (usable for all their groups)"
                    >
                      💳 Request Credits
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/signin"
                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md"
                  >
                    Sign In to Post
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <CreditRequestModal
          isOpen={showCreditModal}
          onClose={() => {
            setShowCreditModal(false)
            setSelectedGroup(null)
          }}
          onSubmit={async (amount, reason) => {
            await handleRequestCredits(amount, reason, selectedGroup.user.id, selectedGroup.id)
            setShowCreditModal(false)
            setSelectedGroup(null)
          }}
          currentCredits={0}
          preselectedGroupOwnerId={selectedGroup.user.id}
          preselectedGroupId={selectedGroup.id}
        />
      )}
    </>
  )
}

