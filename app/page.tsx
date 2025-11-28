"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import LandingPage from "@/components/LandingPage"
import TelegramMiniAppPage from "@/app/(telegram)/page"
import TelegramLayout from "@/app/(telegram)/layout"

// Root page that detects if we're in Telegram Mini App
// If yes, show Mini App with Telegram layout (auto-auth); if no, show landing page
export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isTelegram, setIsTelegram] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Check if we're in Telegram WebApp
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        setIsTelegram(true)
        tg.ready()
      }
    }
  }, [])

  // If user is logged in and not in Telegram, redirect to app
  useEffect(() => {
    if (isClient && !isTelegram && session?.user && status === "authenticated") {
      // User is logged in on web, redirect to app
      router.push("/app")
    }
  }, [isClient, isTelegram, session, status, router])

  // Show loading while detecting
  if (!isClient || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If in Telegram, show Mini App wrapped in Telegram layout (for auto-auth)
  // Otherwise show landing page
  if (isTelegram) {
    return (
      <TelegramLayout>
        <TelegramMiniAppPage />
      </TelegramLayout>
    )
  }

  return <LandingPage />
}

