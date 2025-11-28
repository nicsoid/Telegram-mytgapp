"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import GrantCreditsModal from "./GrantCreditsModal"
import RejectRequestModal from "./RejectRequestModal"

type User = {
  id: string
  name: string | null
  email: string | null
  telegramUsername: string | null
  role: string
  credits: number
  createdAt: string
  subscriptionTier: string
  subscriptionStatus: string
  isVerified: boolean
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
  const [grantModal, setGrantModal] = useState<{ isOpen: boolean; userId: string; userName: string; currentCredits: number }>({
    isOpen: false,
    userId: "",
    userName: "",
    currentCredits: 0,
  })
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; requestId: string; userName: string; amount: number }>({
    isOpen: false,
    requestId: "",
    userName: "",
    amount: 0,
  })

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

  const handleRejectRequest = async (reason: string) => {
    if (!rejectModal.requestId) return

    setProcessingRequest(rejectModal.requestId)
    try {
      const res = await fetch(`/api/admin/credit-requests/${rejectModal.requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        fetchCreditRequests()
        return Promise.resolve()
      } else {
        const data = await res.json()
        throw new Error(data.error || "Failed to reject request")
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to reject request")
    } finally {
      setProcessingRequest(null)
    }
  }

  // Admin no longer grants credits - only publishers do
  const handleGrantCredits = async () => {
    alert("Admins no longer grant credits. Publishers grant credits to users for their groups.")
    return Promise.reject(new Error("Admins do not grant credits"))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">Manage users, publishers, and credit requests</p>
            </div>
            <Link
              href="/admin/publishers"
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg"
            >
              Manage Publishers
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("users")}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-semibold transition-colors ${
                  activeTab === "users"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                👥 Users
              </button>
              <button
                onClick={() => setActiveTab("credit-requests")}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-semibold transition-colors ${
                  activeTab === "credit-requests"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                💳 Credit Requests
                {creditRequests.length > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    {creditRequests.length}
                  </span>
                )}
              </button>
              <Link
                href="/admin/publishers"
                className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-semibold text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                📊 Publishers
              </Link>
            </nav>
          </div>
        </div>

        {activeTab === "users" && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-bold text-gray-900">All Users</h2>
              <p className="mt-1 text-sm text-gray-600">Manage user accounts and grant credits</p>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-400">Loading users...</div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-sm font-medium text-gray-900">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Credits
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Publisher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-sm">
                                {(user.name || user.email || "U")[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{user.name || "N/A"}</div>
                                <div className="text-sm text-gray-500">
                                  {user.email || user.telegramUsername || user.id}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.role === "ADMIN" 
                                ? "bg-purple-100 text-purple-800"
                                : false // No PUBLISHER role anymore
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">{user.credits.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">credits</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{user.subscriptionTier.replace("_", " ")}</div>
                              <div className={`text-xs ${
                                user.isVerified ? "text-green-600" : "text-gray-500"
                              }`}>
                                {user.isVerified ? "✓ Verified" : "✗ Not Verified"}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                            <span className="text-xs text-gray-400">Publishers grant credits</span>
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
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50">
              <h2 className="text-lg font-bold text-gray-900">Pending Credit Requests</h2>
              <p className="mt-1 text-sm text-gray-600">Review and process credit requests from users</p>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-400">Loading credit requests...</div>
                </div>
              ) : creditRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-sm font-medium text-gray-900">No pending credit requests</p>
                  <p className="mt-1 text-xs text-gray-500">All requests have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {creditRequests.map((request) => (
                    <div
                      key={request.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 text-white font-bold">
                              {(request.user.name || request.user.email || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">
                                {request.user.name || request.user.telegramUsername || "Unknown User"}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {request.user.email || request.user.telegramUsername || request.user.id}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-700">Requested:</span>
                              <span className="text-lg font-bold text-blue-600">{request.amount.toLocaleString()} credits</span>
                            </div>
                            {request.reason && (
                              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                                <p className="text-xs font-medium text-gray-700 mb-1">Reason:</p>
                                <p className="text-sm text-gray-600">{request.reason}</p>
                              </div>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Current balance: <span className="font-semibold text-gray-700">{request.user.credits}</span> credits</span>
                              <span>•</span>
                              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-green-700 hover:to-emerald-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingRequest === request.id ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                              </span>
                            ) : (
                              "✓ Approve"
                            )}
                          </button>
                          <button
                            onClick={() => setRejectModal({
                              isOpen: true,
                              requestId: request.id,
                              userName: request.user.name || request.user.telegramUsername || "User",
                              amount: request.amount,
                            })}
                            disabled={processingRequest === request.id}
                            className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:bg-red-50 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ✕ Reject
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

        {/* Modals */}
        <GrantCreditsModal
          isOpen={grantModal.isOpen}
          onClose={() => setGrantModal({ ...grantModal, isOpen: false })}
          onSubmit={handleGrantCredits}
          userName={grantModal.userName}
          currentCredits={grantModal.currentCredits}
        />

        <RejectRequestModal
          isOpen={rejectModal.isOpen}
          onClose={() => setRejectModal({ ...rejectModal, isOpen: false })}
          onSubmit={handleRejectRequest}
          userName={rejectModal.userName}
          amount={rejectModal.amount}
        />
      </div>
    </div>
  )
}

