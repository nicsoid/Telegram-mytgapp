"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

type User = {
  id: string
  name: string | null
  email: string | null
  telegramUsername: string | null
  role: string
  credits: number
  createdAt: string
  publisher?: {
    id: string
    subscriptionTier: string
    subscriptionStatus: string
    isVerified: boolean
  } | null
  _count: {
    creditTransactions: number
    advertiserPosts: number
  }
}

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

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<"users" | "credit-requests">("users")
  const [users, setUsers] = useState<User[]>([])
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers()
    } else {
      fetchCreditRequests()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch users", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCreditRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/credit-requests?status=PENDING", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setCreditRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Failed to fetch credit requests", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    try {
      const res = await fetch(`/api/admin/credit-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      if (res.ok) {
        fetchCreditRequests()
      }
    } catch (error) {
      console.error("Failed to approve request", error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt("Reason for rejection:")
    if (!reason) return

    setProcessingRequest(requestId)
    try {
      const res = await fetch(`/api/admin/credit-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        fetchCreditRequests()
      }
    } catch (error) {
      console.error("Failed to reject request", error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleGrantCredits = async (userId: string) => {
    const amount = prompt("Enter credit amount:")
    if (!amount || isNaN(parseInt(amount))) return

    const reason = prompt("Reason (optional):") || undefined

    try {
      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: parseInt(amount), reason }),
      })
      if (res.ok) {
        fetchUsers()
        alert("Credits granted successfully")
      }
    } catch (error) {
      console.error("Failed to grant credits", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">Manage users, publishers, and credit requests</p>
            </div>
            <Link
              href="/admin/publishers"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Publishers
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("users")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("credit-requests")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "credit-requests"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Credit Requests ({creditRequests.length})
            </button>
            <Link
              href="/admin/publishers"
              className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              Publishers
            </Link>
          </nav>
        </div>

        {activeTab === "users" && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {loading ? (
                <p className="text-center text-gray-500">Loading users...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Credits
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Publisher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || "N/A"}</div>
                            <div className="text-sm text-gray-500">
                              {user.email || user.telegramUsername || user.id}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {user.credits}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {user.publisher ? (
                              <div>
                                <div>{user.publisher.subscriptionTier}</div>
                                <div className="text-xs">
                                  {user.publisher.isVerified ? "✓ Verified" : "✗ Not Verified"}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                            <button
                              onClick={() => handleGrantCredits(user.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Grant Credits
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "credit-requests" && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {loading ? (
                <p className="text-center text-gray-500">Loading credit requests...</p>
              ) : creditRequests.length === 0 ? (
                <p className="text-center text-gray-500">No pending credit requests</p>
              ) : (
                <div className="space-y-4">
                  {creditRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {request.user.name || request.user.telegramUsername || "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Requesting {request.amount} credits
                            {request.reason && ` - ${request.reason}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            Current balance: {request.user.credits} credits
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {processingRequest === request.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

