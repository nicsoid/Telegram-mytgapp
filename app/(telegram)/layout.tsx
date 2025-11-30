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
    if (typeof window === "undefined") return

    const tg = (window as any).Telegram?.WebApp
    if (!tg) {
      // Check again after a delay in case script loads later
      const timeout = setTimeout(() => {
        const tg2 = (window as any).Telegram?.WebApp
        if (tg2) {
          setIsTelegramWebApp(true)
          tg2.ready()
          tg2.expand()
          attemptAutoAuth(tg2)
        }
      }, 500)
      return () => clearTimeout(timeout)
    }

    setIsTelegramWebApp(true)
    tg.ready()
    tg.expand()

    // Function to attempt auto-authentication
    const attemptAutoAuth = (telegramWebApp: any) => {
      // Skip if already authenticated
      if (status === "authenticated" && session?.user) {
        console.log('[TelegramLayout] User already authenticated, skipping')
        return
      }

      // Check if we've attempted recently (prevent spam)
      const lastAttempt = (window as any).lastAuthAttempt || 0
      const timeSinceLastAttempt = Date.now() - lastAttempt
      if (timeSinceLastAttempt < 2000 && autoSignInAttempted) {
        console.log('[TelegramLayout] Recent attempt, waiting...')
        return
      }

      // Try multiple ways to get initData
      let initData = telegramWebApp.initData
      
      // If initData is not available as string, try to get it from initDataUnsafe
      if (!initData && telegramWebApp.initDataUnsafe) {
        try {
          const params = new URLSearchParams()
          
          if (telegramWebApp.initDataUnsafe.user) {
            params.set('user', JSON.stringify(telegramWebApp.initDataUnsafe.user))
          }
          
          if (telegramWebApp.initDataUnsafe.auth_date) {
            params.set('auth_date', telegramWebApp.initDataUnsafe.auth_date.toString())
          }
          
          if (telegramWebApp.initDataUnsafe.hash) {
            params.set('hash', telegramWebApp.initDataUnsafe.hash)
          }
          
          if (telegramWebApp.initDataUnsafe.query_id) {
            params.set('query_id', telegramWebApp.initDataUnsafe.query_id)
          }
          
          if (telegramWebApp.initDataUnsafe.start_param) {
            params.set('start_param', telegramWebApp.initDataUnsafe.start_param)
          }
          
          initData = params.toString()
          console.log('[TelegramLayout] Converted initDataUnsafe to initData string')
        } catch (e) {
          console.error('[TelegramLayout] Error converting initDataUnsafe:', e)
        }
      }
      
      // Also try to get from window.location.search
      if (!initData) {
        const urlParams = new URLSearchParams(window.location.search)
        initData = urlParams.get('tgWebAppData') || urlParams.get('_auth') || urlParams.get('initData')
      }
      
      if (initData && initData.length > 0) {
        console.log('[TelegramLayout] Auto-authenticating with Telegram WebApp initData')
        console.log('[TelegramLayout] initData length:', initData.length)
        console.log('[TelegramLayout] initData preview:', initData.substring(0, 150))
        console.log('[TelegramLayout] Current session status:', status)
        console.log('[TelegramLayout] Current session user:', session?.user?.id || 'none')
        
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
              }, 3000)
            } else if (result?.ok) {
              console.log('[TelegramLayout] Auto-sign in successful')
              // Session will update automatically via useSession
            } else {
              console.warn('[TelegramLayout] Auto-sign in returned unexpected result:', result)
              // Reset after delay to allow retry
              setTimeout(() => {
                setAutoSignInAttempted(false)
              }, 3000)
            }
          })
          .catch((error) => {
            console.error('[TelegramLayout] Auto-sign in error:', error)
            // Reset after delay to allow retry
            setTimeout(() => {
              setAutoSignInAttempted(false)
            }, 3000)
          })
      } else {
        console.warn('[TelegramLayout] Telegram WebApp detected but no initData available')
        console.log('[TelegramLayout] Available WebApp properties:', Object.keys(telegramWebApp))
        console.log('[TelegramLayout] tg.initData:', telegramWebApp.initData)
        console.log('[TelegramLayout] tg.initDataUnsafe:', telegramWebApp.initDataUnsafe)
        console.log('[TelegramLayout] tg.version:', telegramWebApp.version)
      }
    }

    // Try immediately - attemptAutoAuth will check if already authenticated
    attemptAutoAuth(tg)
    
    // Also try after delays in case session is still initializing or initData becomes available
    // attemptAutoAuth will check authentication status internally
    const timeout1 = setTimeout(() => attemptAutoAuth(tg), 500)
    const timeout2 = setTimeout(() => attemptAutoAuth(tg), 1500)
    const timeout3 = setTimeout(() => attemptAutoAuth(tg), 3000)
    const timeout4 = setTimeout(() => attemptAutoAuth(tg), 5000)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearTimeout(timeout4)
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

