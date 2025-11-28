"use client"

import { useState, useEffect } from "react"

interface CreditRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (amount: number, reason?: string, publisherId?: string) => Promise<void>
  currentCredits?: number
}

export default function CreditRequestModal({
  isOpen,
  onClose,
  onSubmit,
  currentCredits = 0,
}: CreditRequestModalProps) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [publisherId, setPublisherId] = useState("")
  const [publishers, setPublishers] = useState<any[]>([])
  const [loadingPublishers, setLoadingPublishers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setReason("")
      setPublisherId("")
      setError(null)
      fetchPublishers()
    }
  }, [isOpen])

  const fetchPublishers = async () => {
    setLoadingPublishers(true)
    try {
      const res = await fetch("/api/groups/browse", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        // Get unique publishers from groups (using publisher.id)
        const publisherMap = new Map()
        data.groups?.forEach((group: any) => {
          if (group.publisher?.id) {
            const pubId = group.publisher.id
            if (!publisherMap.has(pubId)) {
              publisherMap.set(pubId, {
                id: pubId,
                name: group.publisher.user?.name || group.publisher.user?.telegramUsername || "Unknown Publisher",
                groups: [group],
              })
            } else {
              publisherMap.get(pubId).groups.push(group)
            }
          }
        })
        setPublishers(Array.from(publisherMap.values()))
      }
    } catch (error) {
      console.error("Failed to fetch publishers", error)
    } finally {
      setLoadingPublishers(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amountNum = parseInt(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid credit amount")
      return
    }

    if (!publisherId) {
      setError("Please select a publisher to request credits from")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(amountNum, reason.trim() || undefined, publisherId)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to submit credit request")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Request Credits</h2>
            <p className="mt-1 text-sm text-gray-500">
              Request credits from a publisher to post ads in their groups
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Current Credits Display */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current Balance</span>
            <span className="text-2xl font-bold text-blue-700">{currentCredits.toLocaleString()}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Publisher <span className="text-red-500">*</span>
            </label>
            {loadingPublishers ? (
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Loading publishers...
              </div>
            ) : publishers.length === 0 ? (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                No publishers available. Publishers need to add groups first.
              </div>
            ) : (
              <select
                value={publisherId}
                onChange={(e) => {
                  setPublisherId(e.target.value)
                  setError(null)
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
                disabled={submitting}
              >
                <option value="">Select a publisher...</option>
                {publishers.map((publisher) => (
                  <option key={publisher.id} value={publisher.id}>
                    {publisher.name} ({publisher.groups.length} group{publisher.groups.length !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Credit Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(null)
                }}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
                disabled={submitting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                credits
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Minimum: 1 credit
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need these credits..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {reason.length} / 500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !amount || parseInt(amount) <= 0}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            Your request will be reviewed by the publisher. You'll be notified once it's processed.
          </p>
        </div>
      </div>
    </div>
  )
}

