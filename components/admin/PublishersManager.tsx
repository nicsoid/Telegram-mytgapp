"use client"

import { useState, useEffect } from "react"
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
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    telegramUsername: string | null
    credits: number
    createdAt: string
  }
  groups: Array<{
    id: string
    name: string
    isVerified: boolean
    isActive: boolean
  }>
  _count: {
    groups: number
    posts: number
    managedUsers: number
  }
}

export default function PublishersManager() {
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    subscriptionTier: "",
    subscriptionStatus: "",
    isVerified: "",
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    fetchPublishers()
  }, [pagination.page, search, filters])

  const fetchPublishers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(filters.subscriptionTier && { subscriptionTier: filters.subscriptionTier }),
        ...(filters.subscriptionStatus && { subscriptionStatus: filters.subscriptionStatus }),
        ...(filters.isVerified && { isVerified: filters.isVerified }),
      })

      const res = await fetch(`/api/admin/publishers?${params}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setPublishers(data.publishers || [])
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch publishers", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setSearch("")
    setFilters({
      subscriptionTier: "",
      subscriptionStatus: "",
      isVerified: "",
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "REVENUE_SHARE":
        return "bg-purple-100 text-purple-800"
      case "MONTHLY":
        return "bg-blue-100 text-blue-800"
      case "FREE":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800"
      case "CANCELED":
        return "bg-red-100 text-red-800"
      case "EXPIRED":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Publishers Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage and monitor all publishers on the platform
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                placeholder="Search by name, email, or username..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Subscription Tier Filter */}
            <div>
              <label
                htmlFor="tier"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Subscription Tier
              </label>
              <select
                id="tier"
                value={filters.subscriptionTier}
                onChange={(e) => handleFilterChange("subscriptionTier", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Tiers</option>
                <option value="FREE">Free</option>
                <option value="MONTHLY">Monthly</option>
                <option value="REVENUE_SHARE">Revenue Share</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Status
              </label>
              <select
                id="status"
                value={filters.subscriptionStatus}
                onChange={(e) => handleFilterChange("subscriptionStatus", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELED">Canceled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div>
              <label
                htmlFor="verified"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Verification
              </label>
              <select
                id="verified"
                value={filters.isVerified}
                onChange={(e) => handleFilterChange("isVerified", e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            {(search || filters.subscriptionTier || filters.subscriptionStatus || filters.isVerified) && (
              <button
                onClick={clearFilters}
                className="mt-6 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Publishers Table */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading publishers...</p>
              </div>
            ) : publishers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No publishers found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Publisher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Verification
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Earnings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {publishers.map((publisher) => (
                        <tr key={publisher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {publisher.user.name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {publisher.user.email || publisher.user.telegramUsername || publisher.user.id}
                            </div>
                            {publisher.user.telegramUsername && (
                              <div className="text-xs text-gray-400">
                                @{publisher.user.telegramUsername}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTierBadgeColor(
                                  publisher.subscriptionTier
                                )}`}
                              >
                                {publisher.subscriptionTier.replace("_", " ")}
                              </span>
                              <div>
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeColor(
                                    publisher.subscriptionStatus
                                  )}`}
                                >
                                  {publisher.subscriptionStatus}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              {publisher.isVerified ? (
                                <span className="inline-flex items-center text-green-600">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-gray-400">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Not Verified
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {publisher.telegramVerified && "✓ Telegram"}
                              {publisher.telegramVerified && publisher.emailVerified && " • "}
                              {publisher.emailVerified && "✓ Email"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>Groups: {publisher._count.groups}</div>
                            <div>Posts: {publisher._count.posts}</div>
                            <div>Managed Users: {publisher._count.managedUsers}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="text-gray-900 font-medium">
                              {publisher.totalEarnings} credits
                            </div>
                            <div className="text-gray-500">Spent: {publisher.totalSpent}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/admin/users?userId=${publisher.user.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                        }
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: Math.min(prev.pages, prev.page + 1),
                          }))
                        }
                        disabled={pagination.page === pagination.pages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{" "}
                          <span className="font-medium">
                            {(pagination.page - 1) * pagination.limit + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{" "}
                          of <span className="font-medium">{pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav
                          className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                          aria-label="Pagination"
                        >
                          <button
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: Math.max(1, prev.page - 1),
                              }))
                            }
                            disabled={pagination.page === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                            .filter(
                              (page) =>
                                page === 1 ||
                                page === pagination.pages ||
                                (page >= pagination.page - 1 && page <= pagination.page + 1)
                            )
                            .map((page, idx, arr) => (
                              <div key={page}>
                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                    ...
                                  </span>
                                )}
                                <button
                                  onClick={() => setPagination((prev) => ({ ...prev, page }))}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                    pagination.page === page
                                      ? "z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                      : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                                  }`}
                                >
                                  {page}
                                </button>
                              </div>
                            ))}
                          <button
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: Math.min(prev.pages, prev.page + 1),
                              }))
                            }
                            disabled={pagination.page === pagination.pages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

