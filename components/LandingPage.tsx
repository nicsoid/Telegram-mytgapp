"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const displayName =
    session?.user?.name ||
    session?.user?.telegramUsername ||
    session?.user?.email ||
    "Member"

  const appPath =
    session?.user?.role === "ADMIN"
      ? "/admin"
      : false // All users go to /app now
        ? "/dashboard"
        : "/app"

  const appLabel =
    session?.user?.role === "ADMIN"
      ? "Open Admin"
      : false // All users go to /app now
        ? "Open Dashboard"
        : "Open App"

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleGoToApp = () => {
    router.push(appPath)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                My<span className="text-blue-600">Tg</span>App
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <span className="hidden sm:block text-sm text-gray-600">
                    Signed in as <span className="font-medium text-gray-900">{displayName}</span>
                  </span>
                  <button
                    onClick={handleGoToApp}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {appLabel}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/publisher/signup"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-sm font-medium text-blue-800 mb-8">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              Trusted by Telegram group owners worldwide
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Monetize Your
              <br />
              <span className="text-blue-600">Telegram Groups</span>
            </h1>
            <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
              Schedule posts, manage advertisements, and earn revenue from your Telegram communities
              with our powerful, easy-to-use platform.
            </p>
            <div className="mb-10 rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-900">
                <strong>💡 New:</strong> All users can add groups and post ads! Subscribe to unlock group management features. 
                Get 3 free scheduled posts when you sign up, then choose a subscription plan to continue.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!session ? (
                <>
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 bg-white text-gray-700 rounded-lg text-lg font-semibold border-2 border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGoToApp}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    {appLabel}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-8 py-4 bg-white text-gray-700 rounded-lg text-lg font-semibold border-2 border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    Log out
                  </button>
                </>
              )}
            </div>
            {session && (
              <div className="mt-10 flex justify-center">
                <div className="rounded-2xl border border-blue-100 bg-white/80 px-6 py-4 shadow-sm flex items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">Welcome back, {displayName}!</p>
                    <p>Continue where you left off from the app area.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you manage and monetize your Telegram groups
              effectively.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all bg-white">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Schedule Posts</h3>
              <p className="text-gray-600">
                Plan and schedule your Telegram posts in advance. Set specific dates and times for
                maximum engagement.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all bg-white">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Monetize Groups</h3>
              <p className="text-gray-600">
                Earn revenue from paid advertisements. Set your own pricing and manage credit
                transactions seamlessly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all bg-white">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Group Verification</h3>
              <p className="text-gray-600">
                Secure verification system ensures only verified group owners can manage their
                communities.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-xl border border-gray-200 hover:border-yellow-300 hover:shadow-lg transition-all bg-white">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600">
                Manage users, grant credits, and track all activities from a centralized dashboard.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all bg-white">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
              <p className="text-gray-600">
                Track your performance with detailed analytics. Monitor posts, revenue, and engagement
                metrics.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all bg-white">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Built with security in mind. Your data is protected with industry-standard encryption
                and authentication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes! Sign up for free and get 3 scheduled posts. Subscribe to unlock unlimited group management and posting features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Sign Up Free</h3>
              <p className="text-gray-600">
                Create your account and verify your Telegram account. Get 3 free scheduled posts to get started!
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Subscribe & Add Groups</h3>
              <p className="text-gray-600">
                Subscribe to unlock group management. Connect your Telegram groups and verify ownership through our secure bot verification system.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Start Earning</h3>
              <p className="text-gray-600">
                Set your pricing, schedule posts, and start earning revenue from paid
                advertisements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of users who are already managing and monetizing their Telegram groups.
          </p>
          {!session ? (
            <Link
              href="/auth/publisher/signup"
              className="inline-block px-10 py-5 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors shadow-xl"
            >
              Create Your Account
            </Link>
          ) : (
            <Link
              href={appPath}
              className="inline-block px-10 py-5 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors shadow-xl"
            >
              {appLabel}
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              My<span className="text-blue-400">Tg</span>App
            </h3>
            <p className="mb-4">The professional platform for managing Telegram groups</p>
            <p className="text-sm">© {new Date().getFullYear()} MyTgApp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
