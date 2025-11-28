"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState, useRef } from "react"
import { format } from "date-fns"
import FormattingToolbar from "@/components/editor/FormattingToolbar"
import { FormatType, applyFormatting } from "@/lib/richText"
import RichText from "@/components/RichText"

type TelegramGroup = {
  id: string
  name: string
  isVerified: boolean
  pricePerPost: number
  advertiserMessage: string | null
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
  isRecurring: false,
  recurrencePattern: "daily" as "daily" | "weekly" | "monthly" | "custom",
  recurrenceInterval: 1,
  recurrenceEndDate: "",
  recurrenceCount: undefined as number | undefined,
}

export default function AppPostsPage() {
  const { data: session, status } = useSession()
  const [groups, setGroups] = useState<TelegramGroup[]>([])
  const [posts, setPosts] = useState<TelegramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialPost)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const [editingPost, setEditingPost] = useState<TelegramPost | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const verifiedGroups = useMemo(() => groups.filter((g) => g.isVerified), [groups])

  useEffect(() => {
    // Wait for session status to be determined
    if (status === "loading") {
      return // Still loading, don't do anything
    }
    
    if (status === "authenticated" && session?.user) {
      loadGroups()
      loadPosts()
    } else if (status === "unauthenticated") {
      // Only set loading to false if we're sure user is not authenticated
      setLoading(false)
    }
  }, [session, status])

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
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to load posts" }))
        console.error("Failed to load posts:", errorData)
        setMessage(`Error: ${errorData.error || "Failed to load posts"}`)
      }
    } catch (error) {
      console.error("Error loading posts:", error)
      setMessage("An error occurred while loading posts. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList | null, isImage: boolean) => {
    if (!files?.length) return

    setUploadError(null)
    setUploading(true)

    const filesArray = Array.from(files)
    const newUrls: string[] = []

    try {
      for (const file of filesArray) {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
          credentials: "include",
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.error || "Failed to upload file")
        }

        newUrls.push(result.url)
      }

      setForm((prev) => ({
        ...prev,
        mediaUrls: [...prev.mediaUrls, ...newUrls],
      }))
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveMediaUrl = (index: number) => {
    setForm((prev) => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
    }))
  }

  const handleAddMediaUrl = () => {
    setShowUrlInput(true)
  }

  const handleSubmitUrl = () => {
    if (urlInput && urlInput.trim()) {
      setForm((prev) => ({ ...prev, mediaUrls: [...prev.mediaUrls, urlInput.trim()] }))
      setUrlInput("")
      setShowUrlInput(false)
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
    if (!form.content.trim()) {
      setMessage("Please enter post content.")
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const url = editingPost ? `/api/posts/${editingPost.id}` : "/api/posts"
      const method = editingPost ? "PATCH" : "POST"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: form.groupId,
          content: form.content.trim(),
          mediaUrls: form.mediaUrls.filter(Boolean),
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          isPaidAd: form.isPaidAd,
          ...(form.isRecurring && {
            isRecurring: true,
            recurrencePattern: form.recurrencePattern,
            recurrenceInterval: form.recurrencePattern === "custom" ? form.recurrenceInterval : undefined,
            recurrenceEndDate: form.recurrenceEndDate ? new Date(form.recurrenceEndDate).toISOString() : null,
            recurrenceCount: form.recurrenceCount || undefined,
          }),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setForm((prev) => ({ ...initialPost, groupId: prev.groupId }))
        setEditingPost(null)
        setMessage(editingPost ? "✅ Post updated successfully!" : "✅ Post scheduled successfully!")
        setTimeout(() => setMessage(null), 5000)
        loadPosts()
      } else {
        setMessage(data.error || (editingPost ? "Failed to update post" : "Failed to schedule post"))
      }
    } catch (error) {
      setMessage("An error occurred while " + (editingPost ? "updating" : "scheduling") + " the post.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        setMessage("✅ Post deleted successfully!")
        setTimeout(() => setMessage(null), 5000)
        loadPosts()
        setShowDeleteConfirm(null)
      } else {
        const data = await res.json()
        setMessage(data.error || "Failed to delete post")
      }
    } catch (error) {
      setMessage("An error occurred while deleting the post.")
    }
  }

  // Show loading state while session is being checked
  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show "sign in" message if we're sure user is not authenticated
  // Wait a bit longer for session to load in mini app
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-600">
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
                        <RichText text={post.content} className="text-sm" />
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
                    <div className="ml-4 flex flex-col items-end gap-2">
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
                      {post.status !== "SENT" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              // Duplicate post
                              setForm({
                                ...initialPost,
                                groupId: post.group.id,
                                content: post.content,
                                mediaUrls: post.mediaUrls,
                                scheduledAt: "",
                              })
                              // Scroll to form
                              document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" })
                            }}
                            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            title="Duplicate"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => {
                              // Edit post
                              setEditingPost(post)
                              setForm({
                                groupId: post.group.id,
                                content: post.content,
                                mediaUrls: post.mediaUrls,
                                scheduledAt: new Date(post.scheduledAt).toISOString().slice(0, 16),
                                isPaidAd: post.isPaidAd,
                                isRecurring: false,
                                recurrencePattern: "daily",
                                recurrenceInterval: 1,
                                recurrenceEndDate: "",
                                recurrenceCount: undefined,
                              })
                              document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" })
                            }}
                            className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(post.id)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Schedule Post Form */}
        <section id="post-form" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingPost ? "Edit Post" : "Schedule New Post"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {editingPost ? "Update your post content and schedule" : "Create content for your verified groups"}
            </p>
            {editingPost && (
              <button
                onClick={() => {
                  setEditingPost(null)
                  setForm(initialPost)
                }}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Cancel editing
              </button>
            )}
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
                    {group.name} {group.pricePerPost > 0 && `(${group.pricePerPost} credits/post)`}
                  </option>
                ))}
              </select>
              {verifiedGroups.length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  ⚠️ Verify at least one group before scheduling posts
                </p>
              )}
              {form.groupId && (() => {
                const selectedGroup = verifiedGroups.find(g => g.id === form.groupId)
                return selectedGroup?.advertiserMessage ? (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Message from Group Owner:</p>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedGroup.advertiserMessage}</p>
                  </div>
                ) : null
              })()}
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

            {/* Recurring Schedule Options */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="ml-2 text-sm font-semibold text-gray-700">
                  Recurring Post
                </label>
              </div>
              {form.isRecurring && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Repeat Pattern</label>
                    <select
                      value={form.recurrencePattern}
                      onChange={(e) => setForm((prev) => ({ ...prev, recurrencePattern: e.target.value as any }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom Interval</option>
                    </select>
                  </div>
                  {form.recurrencePattern === "custom" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Every N Days</label>
                      <input
                        type="number"
                        min="1"
                        value={form.recurrenceInterval}
                        onChange={(e) => setForm((prev) => ({ ...prev, recurrenceInterval: parseInt(e.target.value) || 1 }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={form.recurrenceEndDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, recurrenceEndDate: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Occurrences (optional)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.recurrenceCount || ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, recurrenceCount: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Unlimited if empty"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Post Content</label>
              <FormattingToolbar
                onFormat={(format: FormatType) => {
                  const textarea = contentRef.current
                  if (!textarea) return

                  let extra: string | undefined
                  if (format === "link") {
                    const url = prompt("Enter URL (https://example.com)")
                    if (!url) return
                    extra = url
                  }

                  const { value, cursor } = applyFormatting(
                    form.content,
                    textarea.selectionStart,
                    textarea.selectionEnd,
                    format,
                    extra
                  )

                  setForm((prev) => ({ ...prev, content: value }))
                  requestAnimationFrame(() => {
                    textarea.focus()
                    textarea.setSelectionRange(cursor, cursor)
                  })
                }}
              />
              <textarea
                ref={contentRef}
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono"
                rows={8}
                placeholder="Write your post content here... Use formatting buttons above for bold, italic, links, etc."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {form.content.length} characters • Supports: [b]bold[/b], [i]italic[/i], [u]underline[/u], [s]strike[/s], [code]code[/code], [link=URL]text[/link]
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Media Files</label>
              
              {/* Image Upload */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Upload Images</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, true)}
                  disabled={uploading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP up to 5MB each</p>
              </div>

              {/* Video Upload */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Upload Videos</label>
                <input
                  type="file"
                  accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, false)}
                  disabled={uploading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">MP4, MPEG, MOV, AVI up to 50MB each</p>
              </div>

              {/* Or Add URL */}
              <div className="mb-3">
                {!showUrlInput ? (
                  <button
                    type="button"
                    onClick={handleAddMediaUrl}
                    className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-blue-400 hover:bg-blue-50"
                  >
                    + Or Add Media URL
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Enter media URL (image or video)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSubmitUrl}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        Add URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUrlInput(false)
                          setUrlInput("")
                        }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mb-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                  {uploadError}
                </div>
              )}

              {uploading && (
                <div className="mb-2 text-xs text-blue-600">Uploading files...</div>
              )}

              {/* Media Preview */}
              {form.mediaUrls.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Uploaded Media ({form.mediaUrls.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {form.mediaUrls.map((url, index) => {
                      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
                      const isVideo = /\.(mp4|mpeg|mov|avi)$/i.test(url)
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2"
                        >
                          {isImage ? (
                            <img
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="h-16 w-16 rounded object-cover"
                            />
                          ) : isVideo ? (
                            <video
                              src={url}
                              className="h-16 w-16 rounded object-cover"
                              muted
                            />
                          ) : (
                            <div className="h-16 w-16 rounded bg-gray-200 flex items-center justify-center">
                              📎
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {url.split("/").pop()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{url}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMediaUrl(index)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
              {submitting
                ? editingPost
                  ? "⏳ Updating..."
                  : "⏳ Scheduling..."
                : editingPost
                  ? "✏️ Update Post"
                  : "📅 Schedule Post"}
            </button>
          </form>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Post</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(showDeleteConfirm)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
        </section>
      </div>
    </div>
  )
}

