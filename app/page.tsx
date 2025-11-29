"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import LandingPage from "@/components/LandingPage"
import TelegramMiniAppPage from "@/app/(telegram)/page"
import TelegramLayout from "@/app/(telegram)/layout"

// Root page that detects if we're in Telegram Mini App
// If yes, show Mini App with Telegram layout (auto-auth); if no, show landing page
export default function HomePage() {
  const { data: session, status } = useSession()
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null) // null = checking, true = telegram, false = not telegram
  const [isClient, setIsClient] = useState(false)

  // Initialize and detect Telegram WebApp
  useEffect(() => {
    setIsClient(true)
    
    if (typeof window === "undefined") return
    
    // Telegram injects Telegram.WebApp automatically when in Mini App
    // We need to check for actual Telegram-specific data, not just the object existence
    // The script might load in browser but won't have initData
    const checkTelegram = (): boolean => {
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        return false
      }
      
      // Check for actual Telegram data - initData or initDataUnsafe must be present
      // Also check platform to ensure we're in Telegram
      const hasInitData = !!(tg.initData || tg.initDataUnsafe?.user)
      const platform = tg.platform || ''
      const isTelegramPlatform = platform === 'tdesktop' || platform === 'web' || platform === 'ios' || platform === 'android' || platform === 'macos' || platform === 'linux' || platform === 'windows'
      
      // Only consider it Telegram if we have initData AND a valid platform
      // OR if platform is explicitly set (Telegram sets this)
      if (hasInitData && isTelegramPlatform) {
        console.log('[HomePage] ✅ Telegram WebApp detected!')
        console.log('[HomePage] WebApp version:', tg.version)
        console.log('[HomePage] platform:', platform)
        console.log('[HomePage] initData:', tg.initData ? '✅ present' : '❌ missing')
        console.log('[HomePage] initDataUnsafe:', tg.initDataUnsafe ? '✅ present' : '❌ missing')
        tg.ready()
        tg.expand()
        setIsTelegram(true)
        return true
      }
      
      // If script loaded but no initData, we're not in Telegram
      if (tg && !hasInitData) {
        console.log('[HomePage] ❌ Telegram script loaded but no initData - not in Telegram Mini App')
        setIsTelegram(false)
        return false
      }
      
      return false
    }
    
    // Check immediately (Telegram should inject it synchronously)
    if (checkTelegram()) {
      return
    }
    
    // If not found immediately, wait a bit and check again
    // Sometimes it takes a moment for Telegram to inject the object
    let timeout1: NodeJS.Timeout
    let timeout2: NodeJS.Timeout
    
    timeout1 = setTimeout(() => {
      if (checkTelegram()) {
        return
      }
      // Check one more time after a longer delay
      timeout2 = setTimeout(() => {
        if (checkTelegram()) {
          return
        }
        console.log('[HomePage] ❌ Telegram WebApp not detected, showing landing page')
        setIsTelegram(false)
      }, 500)
    }, 200)
    
    return () => {
      clearTimeout(timeout1)
      if (timeout2) clearTimeout(timeout2)
    }
  }, [])

  // Show loading while detecting or while session is loading
  if (!isClient || isTelegram === null || status === "loading") {
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

