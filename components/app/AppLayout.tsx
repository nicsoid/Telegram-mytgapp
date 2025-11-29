"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)

  // Check if we're in Telegram Mini App
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        setIsTelegram(true)
        tg.ready()
        tg.expand()
        // Set viewport height for proper sizing in mini app
        tg.setHeaderColor('#ffffff')
        tg.setBackgroundColor('#f9fafb')
      }
    }
  }, [])

  const displayName = (() => {
    if (!session?.user) return "Member"
    const name = session.user.name
    const telegramUsername = session.user.telegramUsername
    const email = session.user.email
    
    if (name && telegramUsername) {
      return `${name} (@${telegramUsername})`
    }
    if (telegramUsername) {
      return `@${telegramUsername}`
    }
    return name || email || "Member"
  })()

  // Navigation - all users see the same links, plus admin link if admin
  // Dashboard access is controlled by subscription check in the pages
  const navigation = [
    { name: "Overview", href: "/app", icon: "overview" },
    { name: "My Groups", href: "/app/groups", icon: "groups" },
    { name: "My Posts", href: "/app/posts", icon: "posts" },
    { name: "Credits", href: "/app/credits", icon: "credits" },
    { name: "Customers", href: "/app/customers", icon: "customers" },
    { name: "Sticky Posts", href: "/app/sticky-posts", icon: "sticky-posts" },
    { name: "Credit Requests", href: "/app/credit-requests", icon: "credit-requests" },
    { name: "Subscriptions", href: "/app/subscriptions", icon: "subscriptions" },
    ...(session?.user?.role === "ADMIN" ? [{ name: "Admin", href: "/admin", icon: "admin" }] : []),
  ]

  const isActive = (href: string) => {
    // For "/app", only match exactly (not /app/*)
    if (href === "/app") {
      return pathname === href
    }
    // For other routes, match exact path or if pathname starts with href (for nested routes)
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const getIcon = (iconName: string) => {
    const iconClass = "h-5 w-5"
    switch (iconName) {
      case "overview":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case "groups":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20H2m15 0v-2c0-.656-.126-1.283-.356-1.857M2 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case "posts":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case "admin":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case "credit-requests":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case "subscriptions":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      case "credits":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case "sticky-posts":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )
      case "customers":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20H2m15 0v-2c0-.656-.126-1.283-.356-1.857M2 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 ${isTelegram ? 'overflow-x-hidden' : ''}`}>
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className={`mx-auto ${isTelegram ? 'w-full px-2 sm:px-4' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-105">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="hidden sm:block text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  My<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Tg</span>App
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-gray-700 hover:bg-gray-100/80 hover:text-gray-900"
                  }`}
                >
                  <span className={isActive(item.href) ? "text-white" : "text-gray-600"}>
                    {getIcon(item.icon)}
                  </span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
              </div>
              <button
                onClick={async () => {
                  // Clear any Telegram widget data from localStorage
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("telegram_widget_data")
                    localStorage.removeItem("telegram_auth_data")
                  }
                  await signOut({ callbackUrl: "/", redirect: true })
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md hover:border-gray-300"
              >
                Sign Out
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
            <div className="space-y-1 px-4 pb-4 pt-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className={isActive(item.href) ? "text-white" : "text-gray-600"}>
                    {getIcon(item.icon)}
                  </span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className={`mx-auto ${isTelegram ? 'w-full px-2 py-4 sm:px-4' : 'max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}`}>{children}</main>
    </div>
  )
}

