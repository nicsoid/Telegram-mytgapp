# How to Log Out Properly

## For Regular Web Users

1. Click the "Sign Out" or "Log out" button in the navigation menu
2. You will be redirected to the landing page
3. If you still see your session, try:
   - Clearing browser cookies for this domain
   - Using a private/incognito window
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## For Telegram Mini App Users

If you're using the Telegram Mini App and want to log out:

1. Click the "Sign Out" button in the app
2. The app will clear your session and redirect you
3. If you're still logged in after signing out:
   - Close the Mini App completely
   - Reopen it from Telegram
   - The session should be cleared

## Troubleshooting

### Still seeing "Sign In" button after logging in

This usually means:
- The session is still loading (wait a few seconds)
- Browser cache needs to be cleared
- Try refreshing the page

### Can't log out completely

If the logout button doesn't work:

1. **Clear Browser Storage:**
   - Open browser DevTools (F12)
   - Go to Application/Storage tab
   - Clear Local Storage and Session Storage
   - Clear Cookies for this domain

2. **For Telegram Widget:**
   - The Telegram Login Widget may cache authentication data
   - Clear browser cache completely
   - Or use a different browser/device

3. **Manual Logout:**
   - Delete cookies manually:
     - `next-auth.session-token`
     - `next-auth.csrf-token`
     - Any Telegram-related cookies

### Logout from Command Line (Development)

If you need to clear all sessions (development only):

```bash
# Connect to your database
psql -U postgres -d mytgapp

# Clear all NextAuth sessions (WARNING: logs out all users)
DELETE FROM "Session";
```

## Technical Details

The logout process:
1. Calls NextAuth's `signOut()` function
2. Clears the session cookie
3. Clears any Telegram widget data from localStorage
4. Redirects to the landing page

If you're still having issues, the session might be cached. Try:
- Hard refresh (Ctrl+F5)
- Clear browser cache
- Use incognito/private mode

