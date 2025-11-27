import crypto from 'crypto'
import { getVideoDimensions } from './videoDimensions'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Verify Telegram WebApp init data
 * Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    if (!hash) return false

    urlParams.delete('hash')
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return calculatedHash === hash
  } catch {
    return false
  }
}

/**
 * Verify Telegram Login Widget data
 * Based on: https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramWidgetData(data: Record<string, string>, botToken: string): boolean {
  try {
    const hash = data.hash
    if (!hash) {
      console.error('[verifyTelegramWidgetData] Missing hash in data')
      return false
    }

    // Log bot token info (first 20 chars for security)
    const botTokenPreview = botToken ? `${botToken.substring(0, 20)}...` : 'MISSING'
    const botId = botToken ? botToken.split(':')[0] : 'UNKNOWN'
    console.log('[verifyTelegramWidgetData] Using bot token:', {
      preview: botTokenPreview,
      botId: botId,
      tokenLength: botToken?.length || 0,
    })

    // Create data check string
    const dataCheckString = Object.keys(data)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n')

    console.log('[verifyTelegramWidgetData] Hash calculation details:', {
      dataCheckString: dataCheckString,
      dataCheckStringLength: dataCheckString.length,
      sortedKeys: Object.keys(data).filter(key => key !== 'hash').sort(),
    })

    // Create secret key
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')
    
    console.log('[verifyTelegramWidgetData] Hash calculation:', {
      secretKeyLength: secretKey.length,
      calculatedHash: calculatedHash,
      receivedHash: hash,
    })

    const isValid = calculatedHash === hash
    
    if (!isValid) {
      console.error('[verifyTelegramWidgetData] Hash mismatch', {
        received: hash,
        calculated: calculatedHash,
        dataCheckString,
        dataKeys: Object.keys(data).filter(k => k !== 'hash'),
        botTokenPreview: botTokenPreview,
        botId: botId,
      })
    } else {
      console.log('[verifyTelegramWidgetData] Hash verification successful', {
        botId: botId,
      })
    }

    return isValid
  } catch (error) {
    console.error('[verifyTelegramWidgetData] Error:', error)
    return false
  }
}

/**
 * Parse Telegram WebApp init data
 */
export function parseTelegramInitData(initData: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData)
    const userStr = urlParams.get('user')
    if (!userStr) return null

    const user = JSON.parse(userStr)
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      auth_date: user.auth_date,
      hash: urlParams.get('hash') || '',
    }
  } catch {
    return null
  }
}

/**
 * Parse Telegram Login Widget data
 */
export function parseTelegramWidgetData(data: Record<string, string>): TelegramUser | null {
  try {
    if (!data.id || !data.first_name || !data.auth_date) {
      return null
    }

    return {
      id: parseInt(data.id),
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      photo_url: data.photo_url,
      auth_date: parseInt(data.auth_date),
      hash: data.hash || '',
    }
  } catch {
    return null
  }
}

function getBotToken() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured')
  }
  return botToken
}

async function callTelegramMethod<T>(method: string, payload: Record<string, unknown>) {
  const botToken = getBotToken()
  const url = `https://api.telegram.org/bot${botToken}/${method}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Telegram API error: ${error.description || response.statusText}`)
  }

  return response.json() as Promise<T>
}

function toAbsoluteUrl(url: string, baseUrl?: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Ensure HTTPS for Telegram (Telegram requires HTTPS for media URLs)
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    return url
  }
  // Ensure we use HTTPS
  const defaultBaseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3002'
  const appUrl = defaultBaseUrl.startsWith('https://') 
    ? defaultBaseUrl 
    : defaultBaseUrl.replace('http://', 'https://')
  return `${appUrl}${url.startsWith('/') ? url : `/${url}`}`
}

/**
 * Send message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
    replyMarkup?: any
  }
) {
  return callTelegramMethod('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode,
    reply_markup: options?.replyMarkup,
  })
}

export async function sendTelegramPhoto(
  chatId: string,
  photo: string,
  options?: { caption?: string; parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }
) {
  return callTelegramMethod('sendPhoto', {
    chat_id: chatId,
    photo: toAbsoluteUrl(photo),
    caption: options?.caption,
    parse_mode: options?.parseMode,
  })
}

/**
 * Send video via Telegram Bot API
 * This implementation downloads the video first and uploads it directly for better reliability
 * Falls back to URL method if direct upload fails
 */
export async function sendTelegramVideo(
  chatId: string,
  videoUrl: string,
  options?: { caption?: string; parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }
) {
  const botToken = getBotToken()
  const parseMode = options?.parseMode || 'HTML'
  const absoluteUrl = toAbsoluteUrl(videoUrl)
  
  // Try to download the video and upload it directly (more reliable than URL)
  try {
    console.log(`[sendTelegramVideo] Attempting to download video from: ${absoluteUrl}`)
    // Download the video file with proper headers
    const videoResponse = await fetch(absoluteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
        'Accept': 'video/*, */*',
      },
      redirect: 'follow',
    })
    
    console.log(`[sendTelegramVideo] Response status: ${videoResponse.status} ${videoResponse.statusText}`)
    
    if (!videoResponse.ok) {
      const responseText = await videoResponse.text().catch(() => 'Unable to read response')
      console.error(`[sendTelegramVideo] Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`)
      throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`)
    }
    
    const contentType = videoResponse.headers.get('content-type')
    const contentLength = videoResponse.headers.get('content-length')
    console.log(`[sendTelegramVideo] Video content-type: ${contentType}, size: ${contentLength} bytes`)
    
    // Verify it's actually a video
    if (contentType && !contentType.startsWith('video/') && !contentType.startsWith('application/octet-stream')) {
      const responseText = await videoResponse.text().catch(() => 'Unable to read response')
      console.error(`[sendTelegramVideo] Unexpected content-type: ${contentType}`)
      throw new Error(`URL does not point to a video file (content-type: ${contentType})`)
    }
    
    const videoBuffer = await videoResponse.arrayBuffer()
    const videoBlob = Buffer.from(videoBuffer)
    console.log(`[sendTelegramVideo] Downloaded video buffer size: ${videoBlob.length} bytes`)
    
    if (videoBlob.length === 0) {
      throw new Error('Downloaded video file is empty')
    }
    
    // Extract video dimensions to ensure correct aspect ratio
    const dimensions = getVideoDimensions(videoBlob)
    if (dimensions) {
      console.log(`[sendTelegramVideo] Extracted video dimensions: ${dimensions.width}x${dimensions.height}`)
    } else {
      console.warn(`[sendTelegramVideo] Could not extract video dimensions from file`)
    }
    
    // Get filename from URL
    const urlPath = new URL(absoluteUrl).pathname
    const filename = urlPath.split('/').pop() || 'video.mp4'
    
    // Create FormData for multipart upload using form-data package
    const FormDataModule = await import('form-data')
    const FormData = FormDataModule.default
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('video', videoBlob, {
      filename: filename,
      contentType: contentType || 'video/mp4',
    })
    form.append('supports_streaming', 'true')
    
    // Add width and height if we extracted them - this helps Telegram display the video correctly
    if (dimensions) {
      form.append('width', dimensions.width.toString())
      form.append('height', dimensions.height.toString())
    }
    
    if (options?.caption) {
      form.append('caption', options.caption)
      form.append('parse_mode', parseMode)
    }
    
    console.log(`[sendTelegramVideo] Uploading video to Telegram (chat: ${chatId}, filename: ${filename}, size: ${videoBlob.length} bytes)`)
    
    // Also check Telegram's absolute limit
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (videoBlob.length > maxSize) {
      console.warn(`[sendTelegramVideo] Video file is ${(videoBlob.length / 1024 / 1024).toFixed(2)}MB, which exceeds Telegram's 50MB limit. Falling back to URL method.`)
      throw new Error(`Video file too large (${(videoBlob.length / 1024 / 1024).toFixed(2)}MB > 50MB)`)
    }
    
    // Get form headers - form-data package handles boundary automatically
    const formHeaders = form.getHeaders()
    
    // For Node.js fetch, we need to convert form-data stream to a buffer
    // Add timeout for large file uploads (90 seconds should be enough for 50MB)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout
    
    try {
      // Convert form-data stream to buffer for Node.js fetch compatibility
      const formBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        form.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        form.on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        form.on('error', (err) => {
          reject(err)
        })
        // Ensure form is being read
        form.resume()
      })
      
      console.log(`[sendTelegramVideo] Form buffer size: ${formBuffer.length} bytes`)
      
      // Convert Buffer to Uint8Array for fetch compatibility
      const bodyArray = new Uint8Array(formBuffer)
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: 'POST',
        body: bodyArray,
        headers: formHeaders,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      console.log(`[sendTelegramVideo] Telegram response status: ${response.status} ${response.statusText}`)

      const responseText = await response.text().catch(() => 'Unable to read response')
      
      let data: any = null
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[sendTelegramVideo] Failed to parse Telegram response as JSON:`, parseError)
        data = { ok: false, description: `Invalid JSON response: ${responseText.substring(0, 200)}` }
      }

      if (!response.ok || !data?.ok) {
        const description = data?.description || data?.error_code || `Telegram API error (${response.status})`
        console.error(`[sendTelegramVideo] Telegram sendVideo upload error for ${absoluteUrl}:`, {
          status: response.status,
          errorCode: data?.error_code,
          description: data?.description,
        })
        throw new Error(description)
      }

      console.log(`[sendTelegramVideo] Successfully uploaded video to Telegram. Message ID: ${data.result?.message_id}`)
      return data
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Video upload timeout (90 seconds)')
      }
      throw fetchError
    }
  } catch (uploadError: any) {
    // Only fallback to URL method if it's not a size-related error
    const errorMsg = uploadError?.message || String(uploadError)
    const isSizeError = errorMsg.includes('too large') || errorMsg.includes('size')
    
    if (!isSizeError) {
      console.log(`[sendTelegramVideo] Direct upload failed, trying URL method (${absoluteUrl}): ${errorMsg}`)
    } else {
      console.log(`[sendTelegramVideo] File too large for direct upload, using URL method (${absoluteUrl}): ${errorMsg}`)
    }
    
    // Ensure URL is properly formatted and accessible
    // Telegram requires the URL to be publicly accessible and return the video directly
    // For URL method, we need to download the video again to get dimensions
    let urlDimensions: { width: number; height: number } | null = null
    try {
      const urlVideoResponse = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
          'Accept': 'video/*, */*',
        },
        redirect: 'follow',
      })
      if (urlVideoResponse.ok) {
        const urlVideoBuffer = await urlVideoResponse.arrayBuffer()
        const urlVideoBlob = Buffer.from(urlVideoBuffer)
        urlDimensions = getVideoDimensions(urlVideoBlob)
        if (urlDimensions) {
          console.log(`[sendTelegramVideo] Extracted dimensions for URL method: ${urlDimensions.width}x${urlDimensions.height}`)
        }
      }
    } catch (dimError) {
      console.warn(`[sendTelegramVideo] Could not extract dimensions for URL method:`, dimError)
    }
    
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      video: absoluteUrl,
      parse_mode: parseMode,
    }

    // Add width and height if we extracted them
    if (urlDimensions) {
      payload.width = urlDimensions.width
      payload.height = urlDimensions.height
    }

    if (options?.caption) {
      payload.caption = options.caption
    }

    console.log(`[sendTelegramVideo] Sending video via URL method: ${absoluteUrl}`)
    
    // Telegram may take time to fetch large videos, so use a longer timeout (60 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      console.log(`[sendTelegramVideo] URL method response status: ${response.status} ${response.statusText}`)

      const responseText = await response.text().catch(() => 'Unable to read response')
      
      let data: any = null
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[sendTelegramVideo] Failed to parse Telegram URL method response:`, parseError)
        data = { ok: false, description: `Invalid JSON response: ${responseText.substring(0, 200)}` }
      }

      if (!response.ok || !data?.ok) {
        const description = data?.description || `Telegram API error (${response.status})`
        console.error(`[sendTelegramVideo] Telegram sendVideo URL method error for ${absoluteUrl}:`, {
          status: response.status,
          errorCode: data?.error_code,
          description: data?.description,
        })
        throw new Error(description)
      }

      console.log(`[sendTelegramVideo] Successfully sent video via URL method. Message ID: ${data.result?.message_id}`)
      return data
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error(`[sendTelegramVideo] Request timeout after 60 seconds for ${absoluteUrl}`)
        throw new Error('Telegram API request timeout - video file may be too large or server too slow')
      }
      throw fetchError
    }
  }
}

type MediaGroupItem = {
  type: 'photo' | 'video'
  media: string
  caption?: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

export async function sendTelegramMediaGroup(chatId: string, media: MediaGroupItem[]) {
  return callTelegramMethod('sendMediaGroup', {
    chat_id: chatId,
    media: media.map((item) => ({
      type: item.type,
      media: toAbsoluteUrl(item.media),
      caption: item.caption,
      parse_mode: item.parse_mode,
    })),
  })
}

/**
 * Get chat member info (to verify admin status)
 */
type ChatMemberResponse = {
  result?: {
    status?: string
  }
}

export async function getChatMember(chatId: string, userId: string) {
  return callTelegramMethod<ChatMemberResponse>('getChatMember', {
    chat_id: chatId,
    user_id: userId,
  })
}

/**
 * Check if user is admin in chat
 */
export async function isChatAdmin(chatId: string, userId: string): Promise<boolean> {
  try {
    const result = await getChatMember(chatId, userId)
    const status = result.result?.status
    return status === 'administrator' || status === 'creator'
  } catch {
    return false
  }
}
