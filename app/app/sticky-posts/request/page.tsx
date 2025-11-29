"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function StickyPostRequestContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const groupId = searchParams.get("groupId")

  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    content: "",
    mediaUrls: [] as string[],
    periodDays: 7,
  })
  const [mediaUrlInput, setMediaUrlInput] = useState("")

  useEffect(() => {
    if (session?.user && groupId) {
      loadGroup()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [session, status, groupId])

  const loadGroup = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/groups/browse", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const foundGroup = data.groups?.find((g: any) => g.id === groupId)
        if (foundGroup) {
          setGroup(foundGroup)
          if (foundGroup.stickyPostPeriodDays) {
            setFormData((prev) => ({ ...prev, periodDays: foundGroup.stickyPostPeriodDays }))
          }
        } else {
          setError("Group not found")
        }
      }
    } catch (error) {
      console.error("Failed to load group", error)
      setError("Failed to load group information")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMediaUrl = () => {
    if (mediaUrlInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        mediaUrls: [...prev.mediaUrls, mediaUrlInput.trim()],
      }))
      setMediaUrlInput("")
    }
  }

  const handleRemoveMediaUrl = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !groupId) return

    setSubmitting(true)
    setError(null)

    try {
      const totalCost = (group.stickyPostPrice || 0) * formData.periodDays

      if (!confirm(`This will cost ${totalCost} credits for ${formData.periodDays} day(s). Continue?`)) {
        setSubmitting(false)
        return
      }

      const res = await fetch("/api/sticky-posts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId,
          content: formData.content,
          mediaUrls: formData.mediaUrls,
          periodDays: formData.periodDays,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to submit request")
        return
      }

      alert("Sticky post request submitted successfully!")
      router.push("/app/sticky-posts")
    } catch (error) {
      console.error("Failed to submit request", error)
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to request sticky posts</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || "Group not found"}</p>
        </div>
      </div>
    )
  }

  const totalCost = (group.stickyPostPrice || 0) * formData.periodDays

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Sticky Post</h1>
        <p className="text-gray-600 mb-8">
          Request a sticky post for <strong>{group.name}</strong>
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700">Group Information</p>
            <p className="text-lg font-semibold text-gray-900">{group.name}</p>
            {group.username && <p className="text-sm text-gray-500">@{group.username}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Price per day:</p>
              <p className="font-semibold text-blue-600">{group.stickyPostPrice} credits</p>
            </div>
            <div>
              <p className="text-gray-600">Default period:</p>
              <p className="font-semibold">{group.stickyPostPeriodDays || 7} days</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter the content for your sticky post..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media URLs (optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddMediaUrl()
                  }
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Add
              </button>
            </div>
            {formData.mediaUrls.length > 0 && (
              <div className="space-y-2">
                {formData.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-2"
                  >
                    <span className="text-xs text-gray-700 truncate flex-1">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMediaUrl(idx)}
                      className="ml-2 text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period (days) *
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.periodDays}
              onChange={(e) =>
                setFormData({ ...formData, periodDays: parseInt(e.target.value) || 1 })
              }
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              How many days should the post be stickied?
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Total Cost</p>
                <p className="text-2xl font-bold text-blue-600">{totalCost} credits</p>
                <p className="text-xs text-blue-700 mt-1">
                  {group.stickyPostPrice} credits/day × {formData.periodDays} day
                  {formData.periodDays !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function StickyPostRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <StickyPostRequestContent />
    </Suspense>
  )
}

