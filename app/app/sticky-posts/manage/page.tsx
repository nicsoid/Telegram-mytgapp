"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

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
}

export default function ManageStickyPostsPage() {
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState<StickyPostRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "fulfilled">("pending")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

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
        `/api/sticky-posts/requests?type=received${statusParam ? `&status=${statusParam}` : ""}`,
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

  const handleUpdateRequest = async (requestId: string, newStatus: "APPROVED" | "REJECTED" | "FULFILLED") => {
    setProcessingId(requestId)
    try {
      const res = await fetch(`/api/sticky-posts/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          notes: notes[requestId] || undefined,
        }),
      })

      if (res.ok) {
        await loadRequests()
        setNotes((prev) => {
          const newNotes = { ...prev }
          delete newNotes[requestId]
          return newNotes
        })
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update request")
      }
    } catch (error) {
      console.error("Failed to update request", error)
      alert("An error occurred. Please try again.")
    } finally {
      setProcessingId(null)
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
          <p className="text-gray-600">Please sign in to manage sticky post requests</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Sticky Post Requests</h1>
        <p className="text-gray-600 mb-8">
          Review and manage sticky post requests from users for your groups
        </p>

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
            <p className="text-sm font-medium text-gray-900">No sticky post requests</p>
            <p className="mt-1 text-xs text-gray-500">
              Users can request sticky posts for your groups when you enable this feature
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
                      Requested by: {request.user.name || request.user.telegramUsername || "Unknown"}
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

                {/* Notes input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes[request.id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Add notes for the user..."
                  />
                </div>

                {/* Actions */}
                {request.status === "PENDING" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleUpdateRequest(request.id, "APPROVED")}
                      disabled={processingId === request.id}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {processingId === request.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleUpdateRequest(request.id, "REJECTED")}
                      disabled={processingId === request.id}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {processingId === request.id ? "Processing..." : "Reject"}
                    </button>
                  </div>
                )}

                {request.status === "APPROVED" && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => handleUpdateRequest(request.id, "FULFILLED")}
                      disabled={processingId === request.id}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {processingId === request.id
                        ? "Processing..."
                        : "Mark as Fulfilled (Post Sticked)"}
                    </button>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Click this after you have manually sticked the post in Telegram
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t mt-4">
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

