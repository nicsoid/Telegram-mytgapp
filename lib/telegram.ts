import crypto from 'crypto'

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

    // Create data check string
    const dataCheckString = Object.keys(data)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n')

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

    return calculatedHash === hash
  } catch {
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
    photo,
    caption: options?.caption,
    parse_mode: options?.parseMode,
  })
}

export async function sendTelegramVideo(
  chatId: string,
  video: string,
  options?: { caption?: string; parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' }
) {
  return callTelegramMethod('sendVideo', {
    chat_id: chatId,
    video,
    caption: options?.caption,
    parse_mode: options?.parseMode,
    supports_streaming: true,
  })
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
      media: item.media,
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
