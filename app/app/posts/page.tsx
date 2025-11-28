"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"

type TelegramGroup = {
  id: string
  name: string
  isVerified: boolean
  pricePerPost: number
}

type TelegramPost = {
  id: string
  content: string
  mediaUrls: string[]
  scheduledAt: string
  status: string
  isPaidAd: boolean
  group: { id: string; name: string }
}

const initialPost = {
  groupId: "",
  content: "",
  mediaUrls: [] as string[],
  scheduledAt: "",
  isPaidAd: false,
}

export default function AppPostsPage() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<TelegramGroup[]>([])
  const [posts, setPosts] = useState<TelegramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialPost)
  const [message, setMessage] = useState<string | null>(null)

  const verifiedGroups = useMemo(() => groups.filter((g) => g.isVerified), [groups])

  useEffect(() => {
    if (session?.user) {
      loadGroups()
      loadPosts()
    }
  }, [session])

  const loadGroups = async () => {
    const res = await fetch("/api/groups", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setGroups(data.groups || [])
      const firstVerified = data.groups?.find((g: TelegramGroup) => g.isVerified)
      if (firstVerified && !form.groupId) {
        setForm((prev) => ({ ...prev, groupId: firstVerified.id }))
      }
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/posts", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddMediaUrl = () => {
    const url = prompt("Enter media URL (image or video):")
    if (url && url.trim()) {
      setForm((prev) => ({ ...prev, mediaUrls: [...prev.mediaUrls, url.trim()] }))
    }
  }

  const handleRemoveMediaUrl = (index: number) => {
    setForm((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }))
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.groupId) {
      setMessage("Please select a verified group.")
      return
    }
    if (!form.scheduledAt) {
      setMessage("Please choose a schedule time.")
      return
    }
    if (!form.content.trim()) {
      setMessage("Please enter post content.")
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: form.groupId,
          content: form.content.trim(),
          mediaUrls: form.mediaUrls.filter(Boolean),
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          isPaidAd: form.isPaidAd,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setForm((prev) => ({ ...initialPost, groupId: prev.groupId }))
        setMessage("✅ Post scheduled successfully!")
        setTimeout(() => setMessage(null), 5000)
        loadPosts()
      } else {
        setMessage(data.error || "Failed to schedule post")
      }
    } catch (error) {
      setMessage("An error occurred while scheduling the post.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Please sign in to manage posts.
      </div>
    )
  }

  const scheduledPosts = posts.filter((p) => p.status === "SCHEDULED")
  const sentPosts = posts.filter((p) => p.status === "SENT")

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Posts</h1>
          <p className="mt-2 text-gray-600">Plan and manage your Telegram content</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-2">
            <div className="text-xs font-medium text-gray-500">Scheduled</div>
            <div className="text-lg font-bold text-blue-700">{scheduledPosts.length}</div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-2">
            <div className="text-xs font-medium text-gray-500">Sent</div>
            <div className="text-lg font-bold text-green-700">{sentPosts.length}</div>
          </div>
          <button
            onClick={loadPosts}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        {/* Posts List */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Your Posts</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{posts.length} total</span>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-400">Loading posts…</div>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-sm font-medium text-gray-900">No posts yet</p>
                <p className="mt-1 text-xs text-gray-500">Schedule your first post using the form</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white font-bold">
                          {post.group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{post.group.name}</h3>
                          <p className="text-xs text-gray-500">
                            {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">
                        {post.content}
                      </p>
                      {post.mediaUrls.length > 0 && (
                        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                          <span>📎</span>
                          <span>{post.mediaUrls.length} media file(s)</span>
                        </div>
                      )}
                      {post.isPaidAd && (
                        <div className="mt-3 inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                          💰 Paid Advertisement
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          post.status === "SENT"
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800"
                            : post.status === "FAILED"
                              ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800"
                              : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800"
                        }`}
                      >
                        {post.status === "SENT" && "✓ "}
                        {post.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Schedule Post Form */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Schedule New Post</h2>
            <p className="mt-1 text-sm text-gray-500">Create content for your verified groups</p>
          </div>

          {message && (
            <div
              className={`mb-4 rounded-lg border p-3 text-sm ${
                message.startsWith("✅")
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handlePostSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Group</label>
              <select
                value={form.groupId}
                onChange={(e) => setForm((prev) => ({ ...prev, groupId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              >
                <option value="" disabled>
                  {verifiedGroups.length === 0 ? "No verified groups yet" : "Choose a group..."}
                </option>
                {verifiedGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} {group.pricePerPost > 0 && `(€${group.pricePerPost}/post)`}
                  </option>
                ))}
              </select>
              {verifiedGroups.length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  ⚠️ Verify at least one group before scheduling posts
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule Time</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Post Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={6}
                placeholder="Write your post content here..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {form.content.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Media URLs</label>
              {form.mediaUrls.length > 0 && (
                <div className="mb-2 space-y-2">
                  {form.mediaUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="truncate text-xs text-gray-600">{url}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMediaUrl(index)}
                        className="ml-2 text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-blue-400 hover:bg-blue-50"
              >
                + Add Media URL
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Add image or video URLs (one per line)
              </p>
            </div>

            <label className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={form.isPaidAd}
                onChange={(e) => setForm((prev) => ({ ...prev, isPaidAd: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Paid Advertisement</span>
                <p className="text-xs text-gray-500">Mark this post as a paid ad</p>
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting || verifiedGroups.length === 0}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "⏳ Scheduling..." : "📅 Schedule Post"}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

