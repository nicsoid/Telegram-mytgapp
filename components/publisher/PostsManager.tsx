"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import FormattingToolbar from "@/components/editor/FormattingToolbar"
import { FormatType, applyFormatting } from "@/lib/richText"
import RichText from "@/components/RichText"

type Group = {
  id: string
  name: string
  isVerified: boolean
}

type Post = {
  id: string
  content: string
  mediaUrls: string[]
  scheduledAt: string
  postedAt: string | null
  status: string
  isPaidAd: boolean
  creditsPaid: number | null
  group: Group
  advertiser: {
    id: string
    name: string | null
    telegramUsername: string | null
  } | null
}

export default function PostsManager() {
  const [posts, setPosts] = useState<Post[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    groupId: "",
    content: "",
    mediaUrls: "",
    scheduledAt: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [postsRes, groupsRes] = await Promise.all([
        fetch("/api/posts", { credentials: "include" }),
        fetch("/api/groups", { credentials: "include" }),
      ])

      if (postsRes.ok) {
        const postsData = await postsRes.json()
        setPosts(postsData.posts || [])
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData.groups || [])
      }
    } catch (error) {
      console.error("Failed to fetch data", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormat = (format: FormatType) => {
    const textarea = contentRef.current
    if (!textarea) return

    let extra: string | undefined
    if (format === "link") {
      const url = prompt("Enter URL (https://example.com)")
      if (!url) return
      extra = url
    }

    const { value, cursor } = applyFormatting(
      formData.content,
      textarea.selectionStart,
      textarea.selectionEnd,
      format,
      extra
    )

    setFormData((prev) => ({ ...prev, content: value }))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const mediaUrlsArray = formData.mediaUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean)

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: formData.groupId,
          content: formData.content,
          mediaUrls: mediaUrlsArray,
          scheduledAt: formData.scheduledAt,
          isPaidAd: false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create post")
        return
      }

      setFormData({
        groupId: "",
        content: "",
        mediaUrls: "",
        scheduledAt: "",
      })
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
        return "bg-green-100 text-green-800"
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800"
      case "FAILED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Posts</h1>
          <p className="mt-2 text-sm text-gray-600">Schedule posts in your Telegram groups</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </div>
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "+ Schedule Post"}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Schedule New Post</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group *</label>
                <select
                  required
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a group</option>
                  {groups
                    .filter((g) => g.isVerified)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Content *</label>
                <FormattingToolbar onFormat={handleFormat} />
                <textarea
                  ref={contentRef}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Use tags like [b]bold[/b], [i]italic[/i], [link=https://example.com]text[/link]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Supported tags: [b], [i], [u], [s], [code], [link=https://example.com]text[/link]
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Media URLs (one per line)
                </label>
                <textarea
                  value={formData.mediaUrls}
                  onChange={(e) => setFormData({ ...formData, mediaUrls: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduled Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Scheduling..." : "Schedule Post"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500">Loading posts...</p>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">No posts scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{post.group.name}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          post.status
                        )}`}
                      >
                        {post.status}
                      </span>
                      {post.isPaidAd && (
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                          Paid Ad ({post.creditsPaid} credits)
                        </span>
                      )}
                    </div>
                    <RichText text={post.content} className="mt-2 max-h-24 overflow-hidden text-sm" />
                    <div className="mt-4 text-sm text-gray-500">
                      <p>
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                        {post.postedAt && ` • Sent: ${new Date(post.postedAt).toLocaleString()}`}
                      </p>
                      {post.advertiser && (
                        <p className="mt-1">
                          Advertiser: {post.advertiser.name || post.advertiser.telegramUsername}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

