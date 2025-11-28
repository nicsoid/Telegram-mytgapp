"use client"

import Link from "next/link"

export default function AppPostsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs text-gray-500">MyTgApp</p>
            <h1 className="text-3xl font-semibold text-gray-900">My Posts</h1>
            <p className="text-sm text-gray-500">This section will list your scheduled and sent posts.</p>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ← Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-900">Posts area coming soon</p>
          <p className="mt-2 text-sm text-gray-500">
            You will be able to view and manage your scheduled posts here. For now, return to the overview to
            manage your credits.
          </p>
          <Link
            href="/app"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to My Account
          </Link>
        </div>
      </main>
    </div>
  )
}

