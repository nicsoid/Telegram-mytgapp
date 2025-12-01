"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import Script from "next/script"

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession()
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [autoSignInAttempted, setAutoSignInAttempted] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true) // Show overlay during initial auth
  const statusRef = useRef(status)
  const sessionRef = useRef(session)
  
  // Keep refs in sync
  useEffect(() => {
    statusRef.current = status
    sessionRef.current = session
  }, [status, session])

  // Prevent navigation during authentication
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isAuthenticating) return

    const preventNavigation = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    const preventClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Allow clicks on the overlay itself, but prevent navigation
      if (target.tagName === 'A' || target.closest('a')) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    window.addEventListener('beforeunload', preventNavigation)
    document.addEventListener('click', preventClick, true)

    return () => {
      window.removeEventListener('beforeunload', preventNavigation)
      document.removeEventListener('click', preventClick, true)
    }
  }, [isAuthenticating])

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
    // This function doesn't check status - it always tries if initData is available
    const attemptAutoAuth = (telegramWebApp: any) => {
      // Check if we've attempted recently (prevent spam)
      const lastAttempt = (window as any).lastAuthAttempt || 0
      const timeSinceLastAttempt = Date.now() - lastAttempt
      if (timeSinceLastAttempt < 500) {
        return // Too soon, skip
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
          console.log('[TelegramLayout] ✅ Converted initDataUnsafe to initData string')
        } catch (e) {
          console.error('[TelegramLayout] ❌ Error converting initDataUnsafe:', e)
        }
      }
      
      // Also try to get from window.location.search
      if (!initData) {
        const urlParams = new URLSearchParams(window.location.search)
        initData = urlParams.get('tgWebAppData') || urlParams.get('_auth') || urlParams.get('initData')
      }
      
      if (initData && initData.length > 0) {
        console.log('[TelegramLayout] 🔐 Attempting auto-authentication...')
        console.log('[TelegramLayout] initData length:', initData.length)
        console.log('[TelegramLayout] initData preview:', initData.substring(0, 100) + '...')
        
        ;(window as any).lastAuthAttempt = Date.now()
        
        // Auto-sign in with Telegram WebApp data
        signIn("credentials", {
          initData,
          redirect: false,
        })
          .then((result) => {
            if (result?.error) {
              console.error('[TelegramLayout] ❌ Auto-sign in failed:', result.error)
              // Retry after delay
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 3000)
            } else if (result?.ok) {
              console.log('[TelegramLayout] ✅ Auto-sign in successful!')
              setAutoSignInAttempted(true)
              setIsAuthenticating(false) // Hide overlay once authenticated
              // Force session refresh to update immediately (no page reload needed)
              // Try multiple times to ensure it works
              const refreshSession = () => {
                update().then(() => {
                  console.log('[TelegramLayout] ✅ Session updated')
                }).catch((err) => {
                  console.error('[TelegramLayout] ❌ Session update error:', err)
                })
              }
              // Immediate refresh
              refreshSession()
              // Also refresh after short delays to ensure it sticks
              setTimeout(refreshSession, 200)
              setTimeout(refreshSession, 500)
            } else {
              console.warn('[TelegramLayout] ⚠️ Unexpected sign-in result:', result)
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 3000)
            }
          })
          .catch((error) => {
            console.error('[TelegramLayout] ❌ Auto-sign in error:', error)
            setTimeout(() => {
              delete (window as any).lastAuthAttempt
            }, 3000)
          })
      } else {
        console.warn('[TelegramLayout] ⚠️ No initData available')
        console.log('[TelegramLayout] tg.initData:', telegramWebApp.initData ? '✅ present' : '❌ missing')
        console.log('[TelegramLayout] tg.initDataUnsafe:', telegramWebApp.initDataUnsafe ? '✅ present' : '❌ missing')
      }
    }

    // Always try to authenticate when in Telegram WebApp
    // Don't check status - just try if initData is available
    attemptAutoAuth(tg)
    
    // Retry multiple times to ensure authentication happens (faster attempts)
    const timeout1 = setTimeout(() => attemptAutoAuth(tg), 200)
    const timeout2 = setTimeout(() => attemptAutoAuth(tg), 500)
    const timeout3 = setTimeout(() => attemptAutoAuth(tg), 1000)
    const timeout4 = setTimeout(() => attemptAutoAuth(tg), 2000)
    const timeout5 = setTimeout(() => {
      // After 5 seconds, if still not authenticated, hide overlay but keep trying
      setIsAuthenticating(false)
      attemptAutoAuth(tg)
    }, 5000)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearTimeout(timeout4)
      clearTimeout(timeout5)
    }
  }, []) // Empty deps - run once on mount

  // Continuous authentication check - handles sign-out and retries
  // This effect runs whenever status or session changes
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const tg = (window as any).Telegram?.WebApp
    if (!tg) {
      // Not in Telegram WebApp - hide overlay
      setIsAuthenticating(false)
      return
    }

    // Helper function to get initData
    const getInitData = (): string | null => {
      let initData = tg.initData
      
      if (!initData && tg.initDataUnsafe) {
        try {
          const params = new URLSearchParams()
          if (tg.initDataUnsafe.user) params.set('user', JSON.stringify(tg.initDataUnsafe.user))
          if (tg.initDataUnsafe.auth_date) params.set('auth_date', tg.initDataUnsafe.auth_date.toString())
          if (tg.initDataUnsafe.hash) params.set('hash', tg.initDataUnsafe.hash)
          if (tg.initDataUnsafe.query_id) params.set('query_id', tg.initDataUnsafe.query_id)
          if (tg.initDataUnsafe.start_param) params.set('start_param', tg.initDataUnsafe.start_param)
          initData = params.toString()
        } catch (e) {
          console.error('[TelegramLayout] Error converting initDataUnsafe:', e)
        }
      }
      
      if (!initData) {
        const urlParams = new URLSearchParams(window.location.search)
        initData = urlParams.get('tgWebAppData') || urlParams.get('_auth') || urlParams.get('initData')
      }
      
      return initData
    }

    // If authenticated, hide overlay and stop
    if (status === "authenticated" && session?.user) {
      setIsAuthenticating(false)
      return
    }

    // If unauthenticated OR loading (after sign-out), try to authenticate
    // Loading status can occur briefly after sign-out before becoming unauthenticated
    if (status === "unauthenticated" || status === "loading" || !session?.user) {
      // Only show overlay if truly unauthenticated (not just loading)
      if (status === "unauthenticated" || !session?.user) {
        setIsAuthenticating(true)
      }
      console.log('[TelegramLayout] 🔄 Status:', status, ', Session:', !!session, ', Attempting auto-auth...')
      
      // Clear any previous attempt timestamps to allow immediate retry
      delete (window as any).lastAuthAttempt
      
      const attemptAuth = () => {
        // Check if we're still unauthenticated (might have changed) - use refs for current values
        if (statusRef.current === "authenticated" && sessionRef.current?.user) {
          setIsAuthenticating(false)
          return
        }
        
        const lastAttempt = (window as any).lastAuthAttempt || 0
        const timeSinceLastAttempt = Date.now() - lastAttempt
        
        // Only attempt if enough time has passed
        if (timeSinceLastAttempt < 300) {
          return
        }
        
        const initData = getInitData()
        
        if (!initData || initData.length === 0) {
          console.warn('[TelegramLayout] ⚠️ No initData available')
          // Clear timestamp to allow retry
          delete (window as any).lastAuthAttempt
          return
        }
        
        console.log('[TelegramLayout] 🔐 Attempting sign-in with initData (length:', initData.length, ')')
        ;(window as any).lastAuthAttempt = Date.now()
        
        signIn("credentials", {
          initData,
          redirect: false,
        })
          .then((result) => {
            if (result?.ok) {
              console.log('[TelegramLayout] ✅ Auto-auth successful!')
              setIsAuthenticating(false)
              // Force session refresh
              const refreshSession = () => {
                update().then(() => {
                  console.log('[TelegramLayout] ✅ Session updated')
                }).catch((err) => {
                  console.error('[TelegramLayout] ❌ Session update error:', err)
                })
              }
              refreshSession()
              setTimeout(refreshSession, 200)
              setTimeout(refreshSession, 500)
            } else if (result?.error) {
              console.error('[TelegramLayout] ❌ Auto-auth failed:', result.error)
              // Clear timestamp to allow retry
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 500)
            }
          })
          .catch((error) => {
            console.error('[TelegramLayout] ❌ Auto-auth error:', error)
            // Clear timestamp to allow retry
            setTimeout(() => {
              delete (window as any).lastAuthAttempt
            }, 500)
          })
      }
      
      // Attempt immediately
      attemptAuth()
      
      // Set up interval to keep retrying
      const intervalId = setInterval(() => {
        // Re-check current status using refs (not from closure)
        if (statusRef.current === "authenticated" && sessionRef.current?.user) {
          clearInterval(intervalId)
          setIsAuthenticating(false)
          return
        }
        attemptAuth()
      }, 1000) // Retry every second
      
      return () => {
        clearInterval(intervalId)
      }
    }
  }, [status, session, update])

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
      
      {/* Blocking overlay during authentication - prevents navigation */}
      {isAuthenticating && (status === "loading" || !session?.user) && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-sm"
          onClick={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          style={{ pointerEvents: 'all' }}
        >
          <div className="text-center max-w-sm px-6">
            <div className="mb-6 text-6xl animate-spin">⏳</div>
            <h2 className="mb-3 text-2xl font-bold text-gray-900">Signing you in...</h2>
            <p className="mb-4 text-gray-600">
              Please wait while we automatically sign you in with your Telegram account.
            </p>
            <p className="text-sm text-gray-500">
              This should only take a few seconds. Do not navigate away.
            </p>
            <div className="mt-6">
              <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-full animate-pulse bg-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </>
  )
}

