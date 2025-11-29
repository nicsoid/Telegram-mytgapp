"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import FormattingToolbar from "@/components/editor/FormattingToolbar"
import { FormatType, applyFormatting } from "@/lib/richText"
import RichText from "@/components/RichText"

type TelegramGroup = {
  id: string
  name: string
  isVerified: boolean
  pricePerPost: number
  freePostIntervalDays: number
  advertiserMessage: string | null
}

type ScheduledTime = {
  id: string
  scheduledAt: string
  postedAt: string | null
  status: string
  failureReason: string | null
  isFreePost: boolean
}

type TelegramPost = {
  id: string
  content: string
  mediaUrls: string[]
  scheduledAt: string
  status: string
  isPaidAd: boolean
  advertiserId: string | null
  group: { id: string; name: string }
  advertiser?: {
    id: string
    name: string | null
    telegramUsername: string | null
  } | null
  scheduledTimes?: ScheduledTime[] // Multiple scheduled times
}

const initialPost = {
  groupId: "",
  content: "",
  mediaUrls: [] as string[],
  scheduledTimes: [] as Array<{ time: string; isFree: boolean }>, // Array of scheduled times with free flag
  isRecurring: false,
  recurrencePattern: "daily" as "daily" | "weekly" | "monthly" | "custom",
  recurrenceInterval: 1,
  recurrenceEndDate: "",
  recurrenceCount: undefined as number | undefined,
}

function AppPostsPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
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
  const [newScheduledTime, setNewScheduledTime] = useState("")
  const [freePostEligibility, setFreePostEligibility] = useState<{
    canUseFree: boolean
    daysRemaining: number | null
    lastFreePostDate: string | null
    isFreeGroup?: boolean
  } | null>(null)

  // Filter groups: must be verified AND owner must have active subscription
  const verifiedGroups = useMemo(() => {
    const filtered = groups.filter((g) => g.isVerified && (g as any).ownerHasActiveSubscription)
    return filtered.map((g: any) => ({
      id: g.id,
      name: g.name,
      isVerified: g.isVerified,
      pricePerPost: g.pricePerPost,
      freePostIntervalDays: g.freePostIntervalDays || 0,
      advertiserMessage: g.advertiserMessage,
      ownerHasActiveSubscription: g.ownerHasActiveSubscription,
    })) as TelegramGroup[]
  }, [groups])

  useEffect(() => {
    // Wait for session status to be determined
    if (status === "loading") {
      setLoading(true) // Keep loading state while session is loading
      return // Still loading, don't do anything
    }
    
    // Only proceed if we have a confirmed session or confirmed unauthenticated state
    // Don't redirect on first load - wait for session to be determined
    if (status === "unauthenticated") {
      setLoading(false)
      return
    }
    
    if (session?.user) {
      // User is authenticated, load data
      // Add a small delay to ensure session is fully initialized (especially for Telegram mini app)
      const timer = setTimeout(() => {
        loadGroups()
        loadPosts()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [session, status])

  const loadGroups = async () => {
    // Load user's own groups
    const ownGroupsRes = await fetch("/api/groups", { credentials: "include" })
    // Load browseable groups (for posting ads)
    const browseRes = await fetch("/api/groups/browse", { credentials: "include" })
    
    if (ownGroupsRes.ok) {
      const ownData = await ownGroupsRes.json()
      const ownGroups = (ownData.groups || []).map((g: any) => ({
        ...g,
        freePostIntervalDays: g.freePostIntervalDays || 0,
        ownerHasActiveSubscription: g.user?.subscriptions?.length > 0 || 
          (g.user?.subscriptionStatus === "ACTIVE" && 
           g.user?.subscriptionTier !== "FREE" &&
           (!g.user?.subscriptionExpiresAt || new Date(g.user.subscriptionExpiresAt) > new Date()))
      }))
      
      if (browseRes.ok) {
        const browseData = await browseRes.json()
        // Merge own groups with browseable groups, prioritizing own groups
        const allGroups = [...ownGroups, ...(browseData.groups || [])]
        // Remove duplicates by id
        const uniqueGroups = Array.from(
          new Map(allGroups.map((g: any) => [g.id, g])).values()
        )
        setGroups(uniqueGroups)
        
        // Check URL parameter first, then find first verified group
        const urlGroupId = searchParams?.get("groupId")
        if (urlGroupId) {
          const urlGroup = uniqueGroups.find((g: any) => g.id === urlGroupId)
          if (urlGroup && urlGroup.isVerified && urlGroup.ownerHasActiveSubscription) {
            setForm((prev) => ({ ...prev, groupId: urlGroupId }))
          }
        } else {
          const firstVerified = uniqueGroups.find((g: any) => g.isVerified && g.ownerHasActiveSubscription)
          if (firstVerified && !form.groupId) {
            setForm((prev) => ({ ...prev, groupId: firstVerified.id }))
          }
        }
      } else {
        setGroups(ownGroups)
        const firstVerified = ownGroups.find((g: any) => g.isVerified && g.ownerHasActiveSubscription)
        if (firstVerified && !form.groupId) {
          setForm((prev) => ({ ...prev, groupId: firstVerified.id }))
        }
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

  const checkFreePostEligibility = async (groupId: string) => {
    if (!groupId) {
      setFreePostEligibility(null)
      return
    }
    try {
      const res = await fetch(`/api/posts/free-post-eligibility?groupId=${groupId}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setFreePostEligibility(data)
      }
    } catch (error) {
      console.error("Failed to check free post eligibility", error)
    }
  }

  useEffect(() => {
    if (form.groupId) {
      checkFreePostEligibility(form.groupId)
    } else {
      setFreePostEligibility(null)
    }
  }, [form.groupId])

  const handleAddScheduledTime = () => {
    if (!newScheduledTime) return
    const selectedDate = new Date(newScheduledTime)
    const now = new Date()
    
    if (selectedDate <= now) {
      setMessage("❌ Cannot schedule posts in the past. Please select a future date and time.")
      setTimeout(() => setMessage(null), 5000)
      return
    }
    
    setForm((prev) => ({
      ...prev,
      scheduledTimes: [...prev.scheduledTimes, { time: newScheduledTime, isFree: false }],
    }))
    setNewScheduledTime("")
  }

  const handleRemoveScheduledTime = (index: number) => {
    setForm((prev) => ({
      ...prev,
      scheduledTimes: prev.scheduledTimes.filter((_, i) => i !== index),
    }))
  }

  const handleToggleFreePost = (index: number) => {
    setForm((prev) => ({
      ...prev,
      scheduledTimes: prev.scheduledTimes.map((st, i) => 
        i === index ? { ...st, isFree: !st.isFree } : st
      ),
    }))
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.groupId) {
      setMessage("Please select a verified group.")
      return
    }
    if (form.scheduledTimes.length === 0) {
      setMessage("Please add at least one scheduled time.")
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
          scheduledTimes: form.scheduledTimes.map((st) => ({
            time: new Date(st.time).toISOString(),
            isFree: st.isFree,
          })),
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
        const wasEditing = !!editingPost
        setForm((prev) => ({ ...initialPost, groupId: prev.groupId }))
        setEditingPost(null)
        setNewScheduledTime("")
        setMessage(wasEditing ? "✅ Post updated successfully!" : "✅ Post scheduled successfully!")
        setTimeout(() => setMessage(null), 5000)
        loadPosts()
      } else {
        const errorMsg = data.error || (editingPost ? "Failed to update post" : "Failed to schedule post")
        setMessage(errorMsg)
        
        // If subscription is required, show link to subscribe
        if (data.requiresSubscription && data.subscribeUrl) {
          setTimeout(() => {
            if (confirm(`${errorMsg}\n\nWould you like to go to the subscription page?`)) {
              window.location.href = data.subscribeUrl
            }
          }, 100)
        }
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
        // If we're editing the deleted post, clear the form
        if (editingPost?.id === postId) {
          setEditingPost(null)
          setForm(initialPost)
        }
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
  // Don't show "sign in" message until we're sure the session is loaded
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show "sign in" message if we're absolutely sure user is not authenticated
  // Wait a bit longer to ensure session is fully loaded (especially for Telegram mini app)
  if (status === "unauthenticated") {
    // Add a small delay to ensure session is fully checked
    // This prevents showing "sign in" message on first load when session is still initializing
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-600">
        Please sign in to manage posts.
      </div>
    )
  }

  // Show loading while data is being fetched (but not while session is loading)
  if (loading && session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    )
  }

  const scheduledPosts = posts.filter((p) => p.status === "SCHEDULED")
  const sentPosts = posts.filter((p) => p.status === "SENT")

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Posts</h1>
          <p className="mt-2 text-gray-600">Plan and manage your Telegram content</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 whitespace-nowrap"
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
                  <div className="space-y-4">
                    {/* Post Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white font-bold flex-shrink-0">
                          {post.group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-gray-900">{post.group.name}</h3>
                            {post.advertiserId && post.advertiser && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                By: {post.advertiser.name || post.advertiser.telegramUsername || "Unknown"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Primary: {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {post.scheduledTimes && post.scheduledTimes.length > 1 && (
                            <p className="text-xs text-blue-600 mt-1">
                              +{post.scheduledTimes.length - 1} more time{post.scheduledTimes.length - 1 > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0 ${
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

                    {/* Post Content */}
                    <div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        <RichText text={post.content} className="text-sm" />
                      </p>
                    </div>

                    {/* Scheduled Times */}
                    {post.scheduledTimes && post.scheduledTimes.length > 0 && (
                      <div className="space-y-2">
                        {post.scheduledTimes.map((st) => {
                          const isPast = new Date(st.scheduledAt) < new Date()
                          const canDelete = !isPast && st.status === "SCHEDULED"
                          
                          return (
                            <div key={st.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs flex-wrap gap-2">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="text-gray-600">
                                  {format(new Date(st.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                                {isPast && (
                                  <span className="text-gray-400">(Past)</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    st.status === "SENT"
                                      ? "bg-green-100 text-green-800"
                                      : st.status === "FAILED"
                                        ? "bg-red-100 text-red-800"
                                        : st.status === "SCHEDULED"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {st.status === "SENT" && "✓ "}
                                  {st.status}
                                </span>
                                {canDelete && (
                                  <button
                                    onClick={async () => {
                                      if (confirm("Delete this scheduled time?")) {
                                        try {
                                          const res = await fetch(`/api/scheduled-times/${st.id}`, {
                                            method: "DELETE",
                                            credentials: "include",
                                          })
                                          if (res.ok) {
                                            setMessage("✅ Scheduled time deleted")
                                            setTimeout(() => setMessage(null), 3000)
                                            loadPosts()
                                          } else {
                                            const data = await res.json()
                                            setMessage(data.error || "Failed to delete scheduled time")
                                          }
                                        } catch (error) {
                                          setMessage("Failed to delete scheduled time")
                                        }
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete this scheduled time"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Media and Paid Ad Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {post.mediaUrls.length > 0 && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>📎</span>
                          <span>{post.mediaUrls.length} media file(s)</span>
                        </div>
                      )}
                      {post.isPaidAd && (
                        <div className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                          💰 Paid Advertisement
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Now below the post content */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          // Duplicate post (copy without editing)
                          setEditingPost(null) // Clear any existing edit
                          setForm({
                            ...initialPost,
                            groupId: post.group.id,
                            content: post.content,
                            mediaUrls: post.mediaUrls,
                            scheduledTimes: [], // Start with empty times, user can add new ones
                          })
                          // Scroll to form
                          document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" })
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400"
                        title="Copy Post"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => {
                          // Edit post - allow editing even if all times are sent
                          setEditingPost(post)
                          // Get only SCHEDULED times for editing (SENT times are kept for stats)
                          const scheduledTimes = post.scheduledTimes?.filter((st) => st.status === "SCHEDULED") || []
                          const now = new Date()
                          const times = scheduledTimes.length > 0
                            ? scheduledTimes
                                .map((st) => ({
                                  time: new Date(st.scheduledAt).toISOString().slice(0, 16),
                                  isFree: st.isFreePost || false,
                                }))
                                .filter((st) => new Date(st.time) > now) // Only include future times
                            : [] // Start with empty if all times are sent, user can add new ones
                            
                          setForm({
                            groupId: post.group.id,
                            content: post.content,
                            mediaUrls: post.mediaUrls,
                            scheduledTimes: times.map((t) => ({ time: new Date(t.time).toISOString(), isFree: t.isFree })),
                            isRecurring: false,
                            recurrencePattern: "daily",
                            recurrenceInterval: 1,
                            recurrenceEndDate: "",
                            recurrenceCount: undefined,
                          })
                          document.getElementById("post-form")?.scrollIntoView({ behavior: "smooth" })
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400"
                        title="Edit Post"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(post.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition-all hover:bg-red-50 hover:border-red-400"
                        title="Delete"
                      >
                        <span>🗑️</span>
                        <span>Delete</span>
                      </button>
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
                  {verifiedGroups.length === 0 ? "No available groups (subscription required)" : "Choose a group..."}
                </option>
                {verifiedGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} {group.pricePerPost === 0 ? "(FREE)" : `(${group.pricePerPost} credits/post)`}
                  </option>
                ))}
              </select>
              {verifiedGroups.length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  ⚠️ No groups available for scheduling. Group owners need active subscriptions to allow post scheduling.
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Scheduled Times</label>
              <p className="text-xs text-gray-500 mb-2">Add multiple posting times for this post</p>
              
              {/* Free Post Eligibility Info */}
              {form.groupId && (() => {
                const selectedGroup = verifiedGroups.find(g => g.id === form.groupId)
                if (!selectedGroup) return null
                const isFreeGroup = selectedGroup.pricePerPost === 0
                const freeInterval = selectedGroup.freePostIntervalDays || 0
                
                // For free groups, show quiet period info
                if (isFreeGroup) {
                  if (freeInterval > 0) {
                    const canPost = freePostEligibility?.canUseFree ?? true
                    const daysRemaining = freePostEligibility?.daysRemaining
                    return (
                      <div className={`mb-3 rounded-lg border p-3 ${
                        canPost ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
                      }`}>
                        <p className={`text-xs font-medium ${
                          canPost ? "text-green-800" : "text-yellow-800"
                        }`}>
                          {canPost ? (
                            <>🆓 This is a free group. You can post for free, but must wait {freeInterval} day(s) between posts.</>
                          ) : (
                            <>⏳ Quiet period: You can post again in {daysRemaining} day(s). Last post: {freePostEligibility?.lastFreePostDate ? format(new Date(freePostEligibility.lastFreePostDate), "MMM d, yyyy") : "N/A"}</>
                          )}
                        </p>
                      </div>
                    )
                  } else {
                    return (
                      <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
                        <p className="text-xs font-medium text-green-800">
                          🆓 This is a free group. You can post for free without any restrictions.
                        </p>
                      </div>
                    )
                  }
                }
                
                // For paid groups, show free post eligibility if interval > 0
                if (!isFreeGroup && freeInterval > 0 && freePostEligibility) {
                  return (
                    <div className={`mb-3 rounded-lg border p-3 ${
                      freePostEligibility.canUseFree 
                        ? "border-green-200 bg-green-50" 
                        : "border-yellow-200 bg-yellow-50"
                    }`}>
                      <p className={`text-xs font-medium ${
                        freePostEligibility.canUseFree ? "text-green-800" : "text-yellow-800"
                      }`}>
                        {freePostEligibility.canUseFree ? (
                          <>✓ You can schedule one free post (no credits deducted) once per {freeInterval} days</>
                        ) : (
                          <>⏳ Free post available in {freePostEligibility.daysRemaining} day(s). Last free post: {freePostEligibility.lastFreePostDate ? format(new Date(freePostEligibility.lastFreePostDate), "MMM d, yyyy") : "N/A"}</>
                        )}
                      </p>
                    </div>
                  )
                }
                
                return null
              })()}

              {/* List of scheduled times */}
              {form.scheduledTimes.length > 0 && (
                <div className="mb-3 space-y-2">
                  {form.scheduledTimes.map((st, index) => {
                    const selectedGroup = verifiedGroups.find(g => g.id === form.groupId)
                    const isFreeGroup = selectedGroup ? selectedGroup.pricePerPost === 0 : false
                    const freeInterval = selectedGroup ? (selectedGroup as TelegramGroup).freePostIntervalDays : 0
                    // Only show free checkbox for paid groups (pricePerPost > 0) with freePostIntervalDays > 0
                    const canMarkFree = !isFreeGroup && freeInterval > 0 && freePostEligibility?.canUseFree
                    const isFree = st.isFree || isFreeGroup // Free groups are always free
                    
                    return (
                      <div key={index} className={`flex items-center gap-2 rounded-lg border p-2 ${
                        isFree ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
                      }`}>
                        <span className="flex-1 text-sm text-gray-700">
                          {format(new Date(st.time), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {isFreeGroup && (
                          <span className="text-xs text-green-700 font-medium">
                            🆓 Free
                          </span>
                        )}
                        {!isFreeGroup && freeInterval > 0 && (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isFree}
                              onChange={() => handleToggleFreePost(index)}
                              disabled={!canMarkFree && !isFree}
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                            />
                            <span className={`text-xs ${isFree ? "text-green-700 font-medium" : "text-gray-500"}`}>
                              Free
                            </span>
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveScheduledTime(index)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add new scheduled time */}
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="datetime-local"
                  value={newScheduledTime}
                  onChange={(e) => setNewScheduledTime(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button
                  type="button"
                  onClick={handleAddScheduledTime}
                  disabled={!newScheduledTime}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Add Time
                </button>
              </div>
              {form.scheduledTimes.length === 0 && editingPost && (
                <p className="mt-2 text-xs text-red-600">
                  ⚠️ At least one scheduled time is required
                </p>
              )}
              {form.scheduledTimes.length === 0 && !editingPost && (
                <p className="mt-2 text-xs text-gray-500">
                  Add at least one scheduled time to schedule this post
                </p>
              )}
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
    </div>
  )
}

export default function AppPostsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AppPostsPageContent />
    </Suspense>
  )
}

