"use client"

import { useState } from "react"
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client"

interface ManageSubscriptionModalProps {
  isOpen: boolean
  userId: string
  userName: string
  currentTier: SubscriptionTier
  currentStatus: SubscriptionStatus
  currentExpiresAt: Date | null
  onClose: () => void
  onUpdate: (data: {
    subscriptionTier?: SubscriptionTier
    subscriptionStatus?: SubscriptionStatus
    subscriptionExpiresAt?: string | null
  }) => Promise<void>
}

export default function ManageSubscriptionModal({
  isOpen,
  userId,
  userName,
  currentTier,
  currentStatus,
  currentExpiresAt,
  onClose,
  onUpdate,
}: ManageSubscriptionModalProps) {
  const [tier, setTier] = useState<SubscriptionTier>(currentTier)
  const [status, setStatus] = useState<SubscriptionStatus>(currentStatus)
  const [expiresAt, setExpiresAt] = useState<string>(
    currentExpiresAt ? new Date(currentExpiresAt).toISOString().slice(0, 16) : ""
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await onUpdate({
        subscriptionTier: tier !== currentTier ? tier : undefined,
        subscriptionStatus: status !== currentStatus ? status : undefined,
        subscriptionExpiresAt: expiresAt ? expiresAt : null,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to update subscription")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Manage Subscription</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">User: <span className="font-medium">{userName}</span></p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as SubscriptionTier)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="FREE">FREE</option>
              <option value="MONTHLY">MONTHLY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty for no expiration</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

