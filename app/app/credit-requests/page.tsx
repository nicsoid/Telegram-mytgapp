"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type CreditRequest = {
  id: string
  amount: number
  reason: string | null
  status: string
  createdAt: string
  groupId: string | null
  user: {
    id: string
    name: string | null
    email: string | null
    telegramUsername: string | null
    credits: number
  }
}

export default function CreditRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<CreditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      router.push("/auth/signin")
      return
    }
    fetchRequests()
  }, [session, status, router, filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/credit-requests?status=${filter}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Failed to fetch credit requests", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setProcessingRequest(requestId)
    setMessage(null)
    try {
      const res = await fetch(`/api/groups/credit-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (res.ok) {
        setMessage("✅ Credit request approved successfully!")
        setTimeout(() => setMessage(null), 5000)
        fetchRequests()
      } else {
        const data = await res.json()
        setMessage(data.error || "Failed to approve request")
      }
    } catch (error) {
      setMessage("An error occurred while approving the request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt("Reason for rejection (optional):")
    if (reason === null) return // User cancelled

    setProcessingRequest(requestId)
    setMessage(null)
    try {
      const res = await fetch(`/api/groups/credit-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: reason || undefined }),
      })
      if (res.ok) {
        setMessage("✅ Credit request rejected")
        setTimeout(() => setMessage(null), 5000)
        fetchRequests()
      } else {
        const data = await res.json()
        setMessage(data.error || "Failed to reject request")
      }
    } catch (error) {
      setMessage("An error occurred while rejecting the request")
    } finally {
      setProcessingRequest(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Credit Requests</h1>
            <p className="mt-2 text-blue-100">
              Review and manage credit requests from users for your groups
            </p>
          </div>
          <div className="hidden md:block">
            <div className="rounded-full bg-white/20 p-4 text-4xl">💳</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.includes("✅") || message.includes("success")
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("PENDING")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            filter === "PENDING"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Pending ({requests.filter((r) => r.status === "PENDING").length})
        </button>
        <button
          onClick={() => setFilter("APPROVED")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            filter === "APPROVED"
              ? "bg-green-600 text-white shadow-md"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter("REJECTED")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            filter === "REJECTED"
              ? "bg-red-600 text-white shadow-md"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading requests...</div>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-sm font-medium text-gray-900">No {filter.toLowerCase()} requests</p>
          <p className="mt-1 text-xs text-gray-500">Credit requests from users will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                      {(request.user.name || request.user.telegramUsername || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {request.user.name || request.user.telegramUsername || "Unknown User"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.user.email || request.user.telegramUsername || request.user.id}
                      </div>
                      {request.user.telegramUsername && (
                        <div className="text-xs text-gray-400">@{request.user.telegramUsername}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Requesting:</span>{" "}
                      <span className="font-bold text-blue-600">{request.amount} credits</span>
                    </div>
                    {request.reason && (
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">Reason:</span> {request.reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Current balance: {request.user.credits} credits •{" "}
                      {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-end space-y-2">
                  {request.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingRequest === request.id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingRequest === request.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingRequest === request.id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {request.status === "APPROVED" && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                      ✓ Approved
                    </span>
                  )}
                  {request.status === "REJECTED" && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                      ✗ Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

