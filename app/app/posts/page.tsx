"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type TelegramGroup = {
  id: string
  name: string
  isVerified: boolean
}

type TelegramPost = {
  id: string
  content: string
  scheduledAt: string
  status: string
  group: { id: string; name: string }
}

const initialPost = {
  groupId: "",
  content: "",
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

    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: form.groupId,
          content: form.content,
          mediaUrls: [],
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          isPaidAd: form.isPaidAd,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setForm((prev) => ({ ...initialPost, groupId: prev.groupId }))
        setMessage("Post scheduled successfully!")
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs text-gray-500">MyTgApp</p>
            <h1 className="text-3xl font-semibold text-gray-900">Scheduled Posts</h1>
            <p className="text-sm text-gray-500">Plan your content across verified groups.</p>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ← Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming & recent posts</h2>
              <button
                onClick={loadPosts}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Refresh
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-gray-500">Loading posts…</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-gray-500">No posts scheduled yet.</p>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{post.group.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          post.status === "SENT"
                            ? "bg-green-100 text-green-800"
                            : post.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{post.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Schedule a new post</h2>
            <p className="text-sm text-gray-500">Select a verified group and choose when to publish.</p>

            {message && (
              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
            )}

            <form onSubmit={handlePostSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Group</label>
                <select
                  value={form.groupId}
                  onChange={(e) => setForm((prev) => ({ ...prev, groupId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="" disabled>
                    {verifiedGroups.length === 0 ? "No verified groups yet" : "Select group"}
                  </option>
                  {verifiedGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {verifiedGroups.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">Verify a group before scheduling posts.</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Schedule time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={5}
                  placeholder="Write the post content…"
                  required
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isPaidAd}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPaidAd: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Mark as paid advertisement
              </label>

              <button
                type="submit"
                disabled={submitting || verifiedGroups.length === 0}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Scheduling…" : "Schedule post"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

