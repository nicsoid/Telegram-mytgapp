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
          tg.expand() // Expand the mini app to full height
          
          // Auto-authenticate if in Telegram Mini App and not signed in
          const checkAndAuth = () => {
            // Only attempt if session is not authenticated or still loading
            // Allow retries if session is still unauthenticated after a delay
            const shouldAttempt = (status === "unauthenticated" || (!session?.user && status !== "loading")) && 
                                  (!autoSignInAttempted || Date.now() - (window as any).lastAuthAttempt > 3000)
            
            if (shouldAttempt) {
              // Try multiple ways to get initData
              // tg.initData is the raw string from Telegram (preferred - this is what we need!)
              let initData = tg.initData
              
              // If initData is not available as string, try to get it from initDataUnsafe
              // Note: initDataUnsafe might not have the hash in the right format, so prefer tg.initData
              if (!initData && tg.initDataUnsafe) {
                try {
                  // initDataUnsafe is an object, we need to convert it to URL-encoded string format
                  const params = new URLSearchParams()
                  
                  // Add user object as JSON string (required)
                  if (tg.initDataUnsafe.user) {
                    params.set('user', JSON.stringify(tg.initDataUnsafe.user))
                  }
                  
                  // Add auth_date (required)
                  if (tg.initDataUnsafe.auth_date) {
                    params.set('auth_date', tg.initDataUnsafe.auth_date.toString())
                  }
                  
                  // Add hash (required for verification - must come from Telegram)
                  if (tg.initDataUnsafe.hash) {
                    params.set('hash', tg.initDataUnsafe.hash)
                  }
                  
                  // Add query_id if present
                  if (tg.initDataUnsafe.query_id) {
                    params.set('query_id', tg.initDataUnsafe.query_id)
                  }
                  
                  // Add start_param if present
                  if (tg.initDataUnsafe.start_param) {
                    params.set('start_param', tg.initDataUnsafe.start_param)
                  }
                  
                  initData = params.toString()
                  console.log('[TelegramLayout] Converted initDataUnsafe to initData string')
                } catch (e) {
                  console.error('[TelegramLayout] Error converting initDataUnsafe:', e)
                }
              }
              
              // Also try to get from window.location.search (Telegram sometimes passes it as query param)
              if (!initData && typeof window !== "undefined") {
                const urlParams = new URLSearchParams(window.location.search)
                initData = urlParams.get('tgWebAppData') || urlParams.get('_auth') || urlParams.get('initData')
              }
              
              if (initData && initData.length > 0) {
                console.log('[TelegramLayout] Auto-authenticating with Telegram WebApp initData')
                console.log('[TelegramLayout] initData length:', initData.length)
                console.log('[TelegramLayout] initData preview:', initData.substring(0, 150))
                setAutoSignInAttempted(true)
                ;(window as any).lastAuthAttempt = Date.now()
                
                // Auto-sign in with Telegram WebApp data
                signIn("credentials", {
                  initData,
                  redirect: false,
                })
                  .then((result) => {
                    console.log('[TelegramLayout] Sign-in result:', result)
                    if (result?.error) {
                      console.error('[TelegramLayout] Auto-sign in failed:', result.error)
                      // Reset after delay to allow retry
                      setTimeout(() => {
                        setAutoSignInAttempted(false)
                        delete (window as any).lastAuthAttempt
                      }, 3000)
                    } else if (result?.ok) {
                      console.log('[TelegramLayout] Auto-sign in successful')
                      // Don't reload - let NextAuth handle the session update
                      // The session will update automatically via useSession
                    } else {
                      console.warn('[TelegramLayout] Auto-sign in returned unexpected result:', result)
                      // Reset after delay to allow retry
                      setTimeout(() => {
                        setAutoSignInAttempted(false)
                        delete (window as any).lastAuthAttempt
                      }, 3000)
                    }
                  })
                  .catch((error) => {
                    console.error('[TelegramLayout] Auto-sign in error:', error)
                    // Reset after delay to allow retry
                    setTimeout(() => {
                      setAutoSignInAttempted(false)
                      delete (window as any).lastAuthAttempt
                    }, 3000)
                  })
              } else {
                console.warn('[TelegramLayout] Telegram WebApp detected but no initData available')
                console.log('[TelegramLayout] Available WebApp properties:', Object.keys(tg))
                console.log('[TelegramLayout] tg.initData:', tg.initData)
                console.log('[TelegramLayout] tg.initDataUnsafe:', tg.initDataUnsafe)
                console.log('[TelegramLayout] tg.version:', tg.version)
              }
            }
          }
          
          // Try immediately
          checkAndAuth()
          
          // Also try after delays in case session is still initializing or initData becomes available
          // Telegram WebApp might need time to initialize
          const timeout1 = setTimeout(checkAndAuth, 500)
          const timeout2 = setTimeout(checkAndAuth, 1500)
          const timeout3 = setTimeout(checkAndAuth, 3000)
          const timeout4 = setTimeout(checkAndAuth, 5000)
          return () => {
            clearTimeout(timeout1)
            clearTimeout(timeout2)
            clearTimeout(timeout3)
            clearTimeout(timeout4)
          }
        }
      }
      
      // Check immediately
      checkTelegram()
      
      // Also check after script might have loaded
      const timeout = setTimeout(checkTelegram, 500)
      return () => clearTimeout(timeout)
    }
  }, [status, session, autoSignInAttempted])

  return (
    <>
      {/* Load Telegram WebApp script if not already loaded */}
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
                tg.expand()
                console.log('[TelegramLayout] Telegram WebApp initialized')
                console.log('[TelegramLayout] initData available:', !!tg.initData)
              }
            }
          }}
        />
      )}
      {children}
    </>
  )
}

