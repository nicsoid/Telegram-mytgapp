const LINK_TAG_REGEX = /\[link=([^\]]+)\]([\s\S]*?)\[\/link\]/gi
const TAG_PATTERNS: Array<{
  tag: string
  htmlOpen: string
  htmlClose: string
  telegramOpen: string
  telegramClose: string
}> = [
  { tag: "b", htmlOpen: "<strong>", htmlClose: "</strong>", telegramOpen: "<b>", telegramClose: "</b>" },
  { tag: "i", htmlOpen: "<em>", htmlClose: "</em>", telegramOpen: "<i>", telegramClose: "</i>" },
  { tag: "u", htmlOpen: "<u>", htmlClose: "</u>", telegramOpen: "<u>", telegramClose: "</u>" },
  { tag: "s", htmlOpen: "<s>", htmlClose: "</s>", telegramOpen: "<s>", telegramClose: "</s>" },
  { tag: "code", htmlOpen: "<code>", htmlClose: "</code>", telegramOpen: "<code>", telegramClose: "</code>" },
]

const URL_REGEX = /((https?:\/\/|www\.)[^\s<]+)/gi

export type RichTextTarget = "web" | "telegram"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function normalizeUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

function replaceLinkTags(text: string, target: RichTextTarget) {
  return text.replace(LINK_TAG_REGEX, (_, link, label) => {
    const safeUrl = normalizeUrl(link.trim())
    if (target === "web") {
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`
    }
    return `<a href="${safeUrl}">${label}</a>`
  })
}

function autoLink(text: string, target: RichTextTarget) {
  return text.replace(URL_REGEX, (match, _p1, offset, full) => {
    const start = offset as number
    if (start > 0) {
      const prefix = full.slice(start - 6, start)
      if (prefix.includes("href=")) {
        return match
      }
    }
    const safeUrl = normalizeUrl(match)
    if (target === "web") {
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${match}</a>`
    }
    return `<a href="${safeUrl}">${match}</a>`
  })
}

function applyTagFormatting(text: string, target: RichTextTarget) {
  let formatted = text
  for (const tag of TAG_PATTERNS) {
    const regex = new RegExp(`\\[${tag.tag}\\]([\\s\\S]*?)\\[\\/${tag.tag}\\]`, "gi")
    formatted = formatted.replace(regex, (_, content) => {
      return target === "web"
        ? `${tag.htmlOpen}${content}${tag.htmlClose}`
        : `${tag.telegramOpen}${content}${tag.telegramClose}`
    })
  }
  return formatted
}

function convertRichText(text: string, target: RichTextTarget) {
  if (!text) return ""
  const lineBreak = target === "web" ? "<br />" : "<br/>"
  let result = escapeHtml(text)
  result = replaceLinkTags(result, target)
  result = applyTagFormatting(result, target)
  result = autoLink(result, target)
  result = result.replace(/\n/g, lineBreak)
  return result
}

export function convertRichTextToHtml(text: string) {
  return convertRichText(text, "web")
}

export function convertRichTextToTelegram(text: string) {
  return convertRichText(text, "telegram")
}

export function stripRichTextTags(text: string) {
  if (!text) return ""
  return text
    .replace(/\[\/?(b|i|u|s|code)\]/gi, "")
    .replace(/\[link=[^\]]+\]/gi, "")
    .replace(/\[\/link\]/gi, "")
}

export type FormatType = "bold" | "italic" | "underline" | "strike" | "code" | "link"

const FORMAT_TOKENS: Record<
  Exclude<FormatType, "link">,
  { open: string; close: string; placeholder: string }
> = {
  bold: { open: "[b]", close: "[/b]", placeholder: "bold text" },
  italic: { open: "[i]", close: "[/i]", placeholder: "italic text" },
  underline: { open: "[u]", close: "[/u]", placeholder: "underlined text" },
  strike: { open: "[s]", close: "[/s]", placeholder: "text" },
  code: { open: "[code]", close: "[/code]", placeholder: "code" },
}

export function applyFormatting(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: FormatType,
  extra?: string
) {
  if (selectionStart === undefined || selectionEnd === undefined) {
    selectionStart = value.length
    selectionEnd = value.length
  }

  let openTag = ""
  let closeTag = ""
  let placeholder = ""

  if (format === "link") {
    if (!extra) {
      return { value, cursor: selectionEnd }
    }
    openTag = `[link=${extra}]`
    closeTag = "[/link]"
    placeholder = "link text"
  } else {
    const token = FORMAT_TOKENS[format]
    openTag = token.open
    closeTag = token.close
    placeholder = token.placeholder
  }

  const selectedText = value.slice(selectionStart, selectionEnd) || placeholder
  const newValue =
    value.slice(0, selectionStart) +
    openTag +
    selectedText +
    closeTag +
    value.slice(selectionEnd)

  const cursor = selectionStart + openTag.length + selectedText.length + closeTag.length

  return { value: newValue, cursor }
}

