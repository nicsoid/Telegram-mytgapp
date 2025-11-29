"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

type StickyPostRequest = {
  id: string
  userId: string
  groupId: string
  groupOwnerId: string
  postId: string | null
  content: string | null
  mediaUrls: string[]
  periodDays: number
  creditsPaid: number
  status: string
  processedBy: string | null
  processedAt: string | null
  fulfilledAt: string | null
  notes: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    telegramUsername: string | null
  }
  group: {
    id: string
    name: string
    username: string | null
  }
  groupOwner: {
    id: string
    name: string | null
    telegramUsername: string | null
  }
}

export default function StickyPostsPage() {
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState<StickyPostRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "fulfilled">("all")

  useEffect(() => {
    if (session?.user) {
      loadRequests()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [session, status, filter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const statusParam = filter !== "all" ? filter.toUpperCase() : undefined
      const res = await fetch(
        `/api/sticky-posts/requests?type=sent${statusParam ? `&status=${statusParam}` : ""}`,
        { credentials: "include" }
      )
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Failed to load sticky post requests", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading sticky post requests...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your sticky post requests</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "APPROVED":
        return "bg-blue-100 text-blue-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "FULFILLED":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sticky Post Requests</h1>
            <p className="text-gray-600">View and manage your sticky post requests</p>
          </div>
          <Link
            href="/app/groups"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Browse Groups
          </Link>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(["all", "pending", "approved", "rejected", "fulfilled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="text-4xl mb-4">📌</div>
            <p className="text-sm font-medium text-gray-900">No sticky post requests yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Browse groups to request sticky posts for your ads
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.group.name}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    {request.group.username && (
                      <p className="text-sm text-gray-500">@{request.group.username}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      Owner: {request.groupOwner.name || request.groupOwner.telegramUsername || "Unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Credits Paid</p>
                    <p className="text-2xl font-bold text-blue-600">{request.creditsPaid}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {request.periodDays} day{request.periodDays !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {request.content && (
                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Post Content:</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.content}</p>
                  </div>
                )}

                {request.mediaUrls && request.mediaUrls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Media ({request.mediaUrls.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {request.mediaUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline break-all"
                        >
                          {url.substring(0, 50)}...
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {request.notes && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-medium text-blue-900 mb-1">Notes from Group Owner:</p>
                    <p className="text-xs text-blue-800">{request.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
                  <p>Requested: {new Date(request.createdAt).toLocaleString()}</p>
                  {request.processedAt && (
                    <p>Processed: {new Date(request.processedAt).toLocaleString()}</p>
                  )}
                  {request.fulfilledAt && (
                    <p>Fulfilled: {new Date(request.fulfilledAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

