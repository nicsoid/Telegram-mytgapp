import { auth } from "@/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin')
  const isOnAuth = req.nextUrl.pathname.startsWith('/auth')

  // Redirect to login if accessing dashboard/admin while logged out
  if (isOnDashboard) {
    if (isLoggedIn) return
    return Response.redirect(new URL('/auth/signin', req.nextUrl))
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if (isOnAuth) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', req.nextUrl))
    }
    return // Allow access to auth pages
  }
})

// Configure matcher to exclude static files and APIs from middleware
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}