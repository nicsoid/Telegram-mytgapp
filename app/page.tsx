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
    // Check if Telegram.WebApp exists - if it does, we're in Telegram (even if initData isn't ready yet)
    const checkTelegram = (): boolean => {
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        return false
      }
      
      // If Telegram.WebApp exists, we're in Telegram Mini App
      // initData might not be available immediately, but it will be soon
      const hasInitData = !!(tg.initData || tg.initDataUnsafe?.user)
      const platform = tg.platform || ''
      
      console.log('[HomePage] 🔍 Checking Telegram WebApp...')
      console.log('[HomePage] Telegram.WebApp exists:', !!tg)
      console.log('[HomePage] platform:', platform || 'not set')
      console.log('[HomePage] initData:', tg.initData ? '✅ present' : '❌ missing')
      console.log('[HomePage] initDataUnsafe:', tg.initDataUnsafe ? '✅ present' : '❌ missing')
      
      // If Telegram.WebApp exists, we're in Telegram (initData will be available soon)
      // The layout will handle authentication once initData is ready
      if (tg) {
        console.log('[HomePage] ✅ Telegram WebApp detected!')
        tg.ready()
        tg.expand()
        setIsTelegram(true)
        return true
      }
      
      return false
    }
    
    // Load Telegram WebApp script if not already loaded
    if (!(window as any).Telegram) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-web-app.js'
      script.async = true
      script.onload = () => {
        console.log('[HomePage] Telegram WebApp script loaded')
        checkTelegram()
      }
      document.head.appendChild(script)
    }
    
    // Check immediately
    if (checkTelegram()) {
      return
    }
    
    // If not found immediately, wait and check again multiple times
    // Telegram might inject it asynchronously
    const timeouts: NodeJS.Timeout[] = []
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
    }, 100))
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
    }, 300))
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
    }, 500))
    
    timeouts.push(setTimeout(() => {
      if (checkTelegram()) return
      console.log('[HomePage] ❌ Telegram WebApp not detected after delays, showing landing page')
      setIsTelegram(false)
    }, 1000))
    
    return () => {
      timeouts.forEach(clearTimeout)
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

