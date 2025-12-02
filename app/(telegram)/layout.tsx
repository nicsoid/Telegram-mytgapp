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

    console.log('[TelegramLayout] 🚀 Initial mount - checking for Telegram WebApp...')

    // Function to attempt auto-authentication
    // This function doesn't check status - it always tries if initData is available
    const attemptAutoAuth = (telegramWebApp: any) => {
      // Check if we've attempted recently (prevent spam)
      const lastAttempt = (window as any).lastAuthAttempt || 0
      const timeSinceLastAttempt = Date.now() - lastAttempt
      if (timeSinceLastAttempt < 300) {
        console.log('[TelegramLayout] ⏸️ Too soon since last attempt, skipping')
        return // Too soon, skip
      }

      // Clear cookies before attempting (helps after sign-out)
      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.trim().split("=")[0]
          if (cookieName.includes("next-auth") || cookieName.includes("authjs")) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
          }
        })
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
          console.log('[TelegramLayout] ✅ Converted initDataUnsafe to initData string (length:', initData.length, ')')
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
        console.log('[TelegramLayout] Current status:', statusRef.current, ', Session:', !!sessionRef.current)
        
        ;(window as any).lastAuthAttempt = Date.now()
        setIsAuthenticating(true)
        
        // Auto-sign in with Telegram WebApp data
        signIn("credentials", {
          initData,
          redirect: false,
        })
          .then((result) => {
            console.log('[TelegramLayout] Sign-in result:', JSON.stringify(result))
            if (result?.error) {
              console.error('[TelegramLayout] ❌ Auto-sign in failed:', result.error)
              // Retry after delay
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 1000)
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
              setTimeout(refreshSession, 1000)
            } else {
              console.warn('[TelegramLayout] ⚠️ Unexpected sign-in result:', result)
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 1000)
            }
          })
          .catch((error) => {
            console.error('[TelegramLayout] ❌ Auto-sign in error:', error, error.stack)
            setTimeout(() => {
              delete (window as any).lastAuthAttempt
            }, 1000)
          })
      } else {
        console.warn('[TelegramLayout] ⚠️ No initData available')
        console.log('[TelegramLayout] tg.initData:', telegramWebApp.initData ? '✅ present' : '❌ missing')
        console.log('[TelegramLayout] tg.initDataUnsafe:', telegramWebApp.initDataUnsafe ? '✅ present' : '❌ missing')
        if (telegramWebApp.initDataUnsafe) {
          console.log('[TelegramLayout] initDataUnsafe content:', JSON.stringify(telegramWebApp.initDataUnsafe))
        }
      }
    }

    const tg = (window as any).Telegram?.WebApp
    if (!tg) {
      console.log('[TelegramLayout] ⏳ Telegram WebApp not found, checking again after delay...')
      // Check again after a delay in case script loads later
      const timeout = setTimeout(() => {
        const tg2 = (window as any).Telegram?.WebApp
        if (tg2) {
          console.log('[TelegramLayout] ✅ Telegram WebApp found after delay')
          setIsTelegramWebApp(true)
          tg2.ready()
          tg2.expand()
          attemptAutoAuth(tg2)
        } else {
          console.log('[TelegramLayout] ❌ Telegram WebApp still not found after delay')
        }
      }, 500)
      return () => clearTimeout(timeout)
    }

    console.log('[TelegramLayout] ✅ Telegram WebApp found immediately')
    setIsTelegramWebApp(true)
    tg.ready()
    tg.expand()

    // Always try to authenticate when in Telegram WebApp
    // Don't check status - just try if initData is available
    console.log('[TelegramLayout] 🚀 Starting immediate auth attempt...')
    attemptAutoAuth(tg)
    
    // Retry multiple times to ensure authentication happens (faster attempts)
    const timeout1 = setTimeout(() => {
      console.log('[TelegramLayout] 🔄 Retry 1 (200ms)')
      attemptAutoAuth(tg)
    }, 200)
    const timeout2 = setTimeout(() => {
      console.log('[TelegramLayout] 🔄 Retry 2 (500ms)')
      attemptAutoAuth(tg)
    }, 500)
    const timeout3 = setTimeout(() => {
      console.log('[TelegramLayout] 🔄 Retry 3 (1000ms)')
      attemptAutoAuth(tg)
    }, 1000)
    const timeout4 = setTimeout(() => {
      console.log('[TelegramLayout] 🔄 Retry 4 (2000ms)')
      attemptAutoAuth(tg)
    }, 2000)
    const timeout5 = setTimeout(() => {
      console.log('[TelegramLayout] 🔄 Retry 5 (5000ms) - hiding overlay but continuing')
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

  // Continuous authentication polling - always checks and attempts auth if needed
  // This doesn't rely on status changes, it polls continuously
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

    // Continuous polling function
    const pollAuth = () => {
      // Always check current status using refs
      const currentStatus = statusRef.current
      const currentSession = sessionRef.current
      
      // If authenticated, hide overlay and stop
      if (currentStatus === "authenticated" && currentSession?.user) {
        setIsAuthenticating(false)
        return
      }

      // If unauthenticated or loading, try to authenticate
      if (currentStatus === "unauthenticated" || currentStatus === "loading" || !currentSession?.user) {
        // Show overlay if unauthenticated
        if (currentStatus === "unauthenticated" || !currentSession?.user) {
          setIsAuthenticating(true)
        }
        
        const lastAttempt = (window as any).lastAuthAttempt || 0
        const timeSinceLastAttempt = Date.now() - lastAttempt
        
        // Only attempt if enough time has passed (500ms)
        if (timeSinceLastAttempt < 500) {
          return
        }
        
        const initData = getInitData()
        
        if (!initData || initData.length === 0) {
          console.warn('[TelegramLayout] ⚠️ No initData available (status:', currentStatus, ')')
          // Clear timestamp to allow retry
          delete (window as any).lastAuthAttempt
          return
        }
        
        console.log('[TelegramLayout] 🔐 Attempting sign-in (status:', currentStatus, ', initData length:', initData.length, ')')
        ;(window as any).lastAuthAttempt = Date.now()
        
        // Clear any NextAuth cookies that might be blocking sign-in
        // This helps after sign-out
        if (typeof document !== "undefined") {
          // Clear NextAuth session cookie
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.trim().split("=")[0]
            if (cookieName.includes("next-auth") || cookieName.includes("authjs")) {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
            }
          })
        }
        
        console.log('[TelegramLayout] 🔐 Calling signIn with initData length:', initData.length)
        signIn("credentials", {
          initData,
          redirect: false,
        })
          .then((result) => {
            console.log('[TelegramLayout] Sign-in result:', JSON.stringify(result))
            if (result?.ok) {
              console.log('[TelegramLayout] ✅ Auto-auth successful!')
              setIsAuthenticating(false)
              // Force session refresh multiple times
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
              setTimeout(refreshSession, 1000)
              setTimeout(refreshSession, 2000)
            } else if (result?.error) {
              console.error('[TelegramLayout] ❌ Auto-auth failed:', result.error, 'Full result:', JSON.stringify(result))
              // Clear timestamp to allow retry
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 1000)
            } else {
              console.warn('[TelegramLayout] ⚠️ Unexpected result:', JSON.stringify(result))
              setTimeout(() => {
                delete (window as any).lastAuthAttempt
              }, 1000)
            }
          })
          .catch((error) => {
            console.error('[TelegramLayout] ❌ Auto-auth error:', error, error.stack)
            // Clear timestamp to allow retry
            setTimeout(() => {
              delete (window as any).lastAuthAttempt
            }, 1000)
          })
      }
    }
    
    // Poll immediately
    pollAuth()
    
    // Set up continuous polling every 800ms
    const intervalId = setInterval(pollAuth, 800)
    
    return () => {
      clearInterval(intervalId)
    }
  }, [status, session, update]) // Keep dependencies to ensure refs are updated

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
            <p className="text-sm text-gray-500 mb-4">
              This should only take a few seconds. Do not navigate away.
            </p>
            <div className="mt-6">
              <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-full animate-pulse bg-blue-600"></div>
              </div>
            </div>
            {/* Manual retry button - always visible */}
            <button
              onClick={async () => {
                console.log('[TelegramLayout] Manual retry triggered')
                const tg = (window as any).Telegram?.WebApp
                if (!tg) {
                  alert('Not in Telegram mini app. Please open this in Telegram.')
                  return
                }
                
                // Clear any attempt timestamps
                delete (window as any).lastAuthAttempt
                
                // Clear NextAuth cookies
                if (typeof document !== "undefined") {
                  document.cookie.split(";").forEach((c) => {
                    const cookieName = c.trim().split("=")[0]
                    if (cookieName.includes("next-auth") || cookieName.includes("authjs")) {
                      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
                      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
                    }
                  })
                }
                
                // Get initData
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
                    console.error('[TelegramLayout] Error:', e)
                  }
                }
                
                if (initData) {
                  console.log('[TelegramLayout] Manual sign-in attempt with initData length:', initData.length)
                  try {
                    const result = await signIn("credentials", { initData, redirect: false })
                    console.log('[TelegramLayout] Manual sign-in result:', JSON.stringify(result))
                    if (result?.ok) {
                      await update()
                      window.location.reload() // Force reload to ensure session is picked up
                    } else {
                      alert(`Sign-in failed: ${result?.error || 'Unknown error'}. Check console for details.`)
                    }
                  } catch (error: any) {
                    console.error('[TelegramLayout] Manual sign-in error:', error)
                    alert(`Sign-in error: ${error.message || 'Unknown error'}. Check console for details.`)
                  }
                } else {
                  console.error('[TelegramLayout] No initData available for manual retry')
                  console.log('[TelegramLayout] tg.initData:', tg.initData ? 'present' : 'missing')
                  console.log('[TelegramLayout] tg.initDataUnsafe:', tg.initDataUnsafe ? 'present' : 'missing')
                  alert('Unable to sign in: No Telegram data available. Please reopen the mini app from Telegram.')
                }
              }}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Retry Sign In
            </button>
          </div>
        </div>
      )}
      
      {children}
    </>
  )
}

