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
    if (!hash) return false

    // CRITICAL FIX: Filter out 'hash' AND any empty/undefined values
    // Telegram does not include fields with empty values in the hash calculation
    const sortedKeys = Object.keys(data)
      .filter(key => key !== 'hash' && data[key])
      .sort()
    
    const dataCheckString = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('\n')

    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest()

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return calculatedHash === hash
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
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    return url
  }
  const defaultBaseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3002'
  const appUrl = defaultBaseUrl.startsWith('https://') 
    ? defaultBaseUrl 
    : defaultBaseUrl.replace('http://', 'https://')
  return `${appUrl}${url.startsWith('/') ? url : `/${url}`}`
}

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

export async function sendTelegramVideo(
  chatId: string,
  videoUrl: string,
  options?: { caption?: string; parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }
) {
  const botToken = getBotToken()
  const parseMode = options?.parseMode || 'HTML'
  const absoluteUrl = toAbsoluteUrl(videoUrl)
  
  try {
    const videoResponse = await fetch(absoluteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
        'Accept': 'video/*, */*',
      },
      redirect: 'follow',
    })
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`)
    }
    
    const contentType = videoResponse.headers.get('content-type')
    const videoBuffer = await videoResponse.arrayBuffer()
    const videoBlob = Buffer.from(videoBuffer)
    
    if (videoBlob.length === 0) throw new Error('Downloaded video file is empty')
    
    const dimensions = getVideoDimensions(videoBlob)
    const urlPath = new URL(absoluteUrl).pathname
    const filename = urlPath.split('/').pop() || 'video.mp4'
    
    const FormDataModule = await import('form-data')
    const FormData = FormDataModule.default
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('video', videoBlob, {
      filename: filename,
      contentType: contentType || 'video/mp4',
    })
    form.append('supports_streaming', 'true')
    
    if (dimensions) {
      form.append('width', dimensions.width.toString())
      form.append('height', dimensions.height.toString())
    }
    
    if (options?.caption) {
      form.append('caption', options.caption)
      form.append('parse_mode', parseMode)
    }
    
    const maxSize = 50 * 1024 * 1024
    if (videoBlob.length > maxSize) {
      throw new Error(`Video file too large (${(videoBlob.length / 1024 / 1024).toFixed(2)}MB > 50MB)`)
    }
    
    const formHeaders = form.getHeaders()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)
    
    try {
      const formBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        form.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
        form.on('end', () => resolve(Buffer.concat(chunks)))
        form.on('error', reject)
        form.resume()
      })
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: 'POST',
        body: new Uint8Array(formBuffer),
        headers: formHeaders,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()

      if (!response.ok || !data?.ok) {
        throw new Error(data?.description || `Telegram API error (${response.status})`)
      }
      return data
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      throw fetchError
    }
  } catch (uploadError: any) {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      video: absoluteUrl,
      parse_mode: parseMode,
    }
    if (options?.caption) payload.caption = options.caption

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()

      if (!response.ok || !data?.ok) {
        throw new Error(data?.description || `Telegram API error (${response.status})`)
      }
      return data
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
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

type ChatMemberResponse = {
  result?: {
    status?: string
  }
}

/**
 * Get Telegram chat information by username
 */
export async function getTelegramChat(username: string) {
  try {
    // Remove @ and t.me/ prefixes if present
    const cleanUsername = username
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?t\.me\//, '')
      .replace(/^t\.me\//, '')
      .trim()

    if (!cleanUsername) {
      throw new Error('Invalid username format')
    }

    const result = await callTelegramMethod<{
      ok: boolean
      result?: {
        id: number
        title?: string
        username?: string
        type: string
        description?: string
      }
      error_code?: number
      description?: string
    }>('getChat', {
      chat_id: `@${cleanUsername}`,
    })

    if (!result.ok || !result.result) {
      throw new Error(result.description || 'Failed to get chat information')
    }

    return {
      chatId: result.result.id.toString(),
      title: result.result.title || cleanUsername,
      username: result.result.username || cleanUsername,
      type: result.result.type,
      description: result.result.description,
    }
  } catch (error: any) {
    throw new Error(`Failed to get Telegram chat: ${error.message}`)
  }
}

export async function getChatMember(chatId: string, userId: string) {
  return callTelegramMethod<ChatMemberResponse>('getChatMember', {
    chat_id: chatId,
    user_id: userId,
  })
}

export async function isChatAdmin(chatId: string, userId: string): Promise<boolean> {
  try {
    const result = await getChatMember(chatId, userId)
    const status = result.result?.status
    return status === 'administrator' || status === 'creator'
  } catch {
    return false
  }
}