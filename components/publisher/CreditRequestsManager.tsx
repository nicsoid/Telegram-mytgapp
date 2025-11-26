"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type CreditRequest = {
  id: string
  amount: number
  reason: string | null
  status: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    telegramUsername: string | null
    credits: number
  }
}

export default function CreditRequestsManager() {
  const [requests, setRequests] = useState<CreditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/publishers/me/credit-requests?status=${filter}`, {
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
    try {
      const res = await fetch(`/api/publishers/me/credit-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      if (res.ok) {
        fetchRequests()
      }
    } catch (error) {
      console.error("Failed to approve request", error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt("Reason for rejection:")
    if (!reason) return

    setProcessingRequest(requestId)
    try {
      const res = await fetch(`/api/publishers/me/credit-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        fetchRequests()
      }
    } catch (error) {
      console.error("Failed to reject request", error)
    } finally {
      setProcessingRequest(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Requests</h1>
              <p className="mt-2 text-sm text-gray-600">
                Users requesting credits from you
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter("PENDING")}
            className={`rounded px-4 py-2 text-sm font-medium ${
              filter === "PENDING"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Pending ({requests.filter((r) => r.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`rounded px-4 py-2 text-sm font-medium ${
              filter === "APPROVED"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`rounded px-4 py-2 text-sm font-medium ${
              filter === "REJECTED"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Rejected
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">No {filter.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {request.user.name || request.user.telegramUsername || "Unknown User"}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {request.user.email || request.user.telegramUsername || request.user.id}
                    </div>
                    <div className="mt-4 text-sm">
                      <span className="text-gray-500">Requesting:</span>{" "}
                      <span className="font-semibold">{request.amount} credits</span>
                    </div>
                    {request.reason && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="text-gray-500">Reason:</span> {request.reason}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      Current balance: {request.user.credits} credits •{" "}
                      {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {request.status === "PENDING" && (
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingRequest === request.id}
                        className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingRequest === request.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingRequest === request.id}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {request.status === "APPROVED" && (
                    <span className="ml-4 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                      Approved
                    </span>
                  )}
                  {request.status === "REJECTED" && (
                    <span className="ml-4 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                      Rejected
                    </span>
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

