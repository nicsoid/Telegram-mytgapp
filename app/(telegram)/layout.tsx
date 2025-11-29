"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import Script from "next/script"

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [autoSignInAttempted, setAutoSignInAttempted] = useState(false)

  useEffect(() => {
    // Check if we're in Telegram WebApp
    if (typeof window !== "undefined") {
      const checkTelegram = () => {
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          setIsTelegramWebApp(true)
          tg.ready()
          
          // Auto-authenticate if in Telegram Mini App and not signed in
          const checkAndAuth = () => {
            // Only attempt if we haven't already tried and session is not loading
            if ((status === "unauthenticated" || status === "loading") && !autoSignInAttempted) {
              const initData = tg.initData || tg.initDataUnsafe
              if (initData) {
                console.log('[TelegramLayout] Auto-authenticating with Telegram WebApp initData')
                console.log('[TelegramLayout] initData length:', initData.length)
                setAutoSignInAttempted(true)
                
                // Auto-sign in with Telegram WebApp data
                signIn("credentials", {
                  initData,
                  redirect: false,
                })
                  .then((result) => {
                    if (result?.error) {
                      console.error('[TelegramLayout] Auto-sign in failed:', result.error)
                      // Reset after delay to allow retry
                      setTimeout(() => {
                        setAutoSignInAttempted(false)
                      }, 2000)
                    } else if (result?.ok) {
                      console.log('[TelegramLayout] Auto-sign in successful')
                      // Force a page refresh to ensure session is established
                      setTimeout(() => {
                        window.location.reload()
                      }, 500)
                    } else {
                      console.warn('[TelegramLayout] Auto-sign in returned unexpected result:', result)
                      // Reset after delay to allow retry
                      setTimeout(() => {
                        setAutoSignInAttempted(false)
                      }, 2000)
                    }
                  })
                  .catch((error) => {
                    console.error('[TelegramLayout] Auto-sign in error:', error)
                    // Reset after delay to allow retry
                    setTimeout(() => {
                      setAutoSignInAttempted(false)
                    }, 2000)
                  })
              } else {
                console.warn('[TelegramLayout] Telegram WebApp detected but no initData available')
                console.log('[TelegramLayout] Available WebApp properties:', Object.keys(tg))
                console.log('[TelegramLayout] tg.initData:', tg.initData)
                console.log('[TelegramLayout] tg.initDataUnsafe:', tg.initDataUnsafe)
                // If no initData, wait a bit and try again (script might still be loading)
                if (status === "loading") {
                  setTimeout(() => {
                    setAutoSignInAttempted(false)
                  }, 1000)
                }
              }
            }
          }
          
          // Try immediately
          checkAndAuth()
          
          // Also try after delays in case session is still initializing
          const timeout1 = setTimeout(checkAndAuth, 500)
          const timeout2 = setTimeout(checkAndAuth, 1500)
          const timeout3 = setTimeout(checkAndAuth, 3000)
          return () => {
            clearTimeout(timeout1)
            clearTimeout(timeout2)
            clearTimeout(timeout3)
          }
        }
      }
      
      // Check immediately
      checkTelegram()
      
      // Also check after script might have loaded
      const timeout = setTimeout(checkTelegram, 200)
      return () => clearTimeout(timeout)
    }
  }, [status, autoSignInAttempted])

  return (
    <>
      {/* Script is loaded in root page, but ensure it's available here too */}
      {typeof window !== "undefined" && !(window as any).Telegram && (
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
          onLoad={() => {
            console.log('[TelegramLayout] Telegram WebApp script loaded')
            // Script loaded, check for Telegram WebApp again
            if (typeof window !== "undefined") {
              const tg = (window as any).Telegram?.WebApp
              if (tg) {
                setIsTelegramWebApp(true)
                tg.ready()
              }
            }
          }}
        />
      )}
      {children}
    </>
  )
}

