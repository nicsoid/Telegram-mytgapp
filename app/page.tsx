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
    // We just need to check if it exists
    const checkTelegram = (): boolean => {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        console.log('[HomePage] ✅ Telegram WebApp detected!')
        console.log('[HomePage] WebApp version:', tg.version)
        console.log('[HomePage] initData:', tg.initData ? '✅ present' : '❌ missing')
        console.log('[HomePage] initDataUnsafe:', tg.initDataUnsafe ? '✅ present' : '❌ missing')
        console.log('[HomePage] platform:', tg.platform)
        console.log('[HomePage] userAgent:', navigator.userAgent)
        tg.ready()
        tg.expand()
        setIsTelegram(true)
        return true
      }
      return false
    }
    
    // Load Telegram WebApp script if not already loaded
    // This is needed for the WebApp API, but Telegram should inject the object automatically
    if (!(window as any).Telegram?.WebApp) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-web-app.js'
      script.async = true
      script.onload = () => {
        console.log('[HomePage] Telegram WebApp script loaded')
        checkTelegram()
      }
      document.head.appendChild(script)
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
        console.log('[HomePage] window.Telegram:', (window as any).Telegram)
        console.log('[HomePage] window.Telegram?.WebApp:', (window as any).Telegram?.WebApp)
        setIsTelegram(false)
      }, 1000)
    }, 300)
    
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

