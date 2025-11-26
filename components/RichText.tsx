import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { convertRichTextToHtml } from "@/lib/richText"

interface RichTextProps {
  text: string
  className?: string
}

export default function RichText({ text, className }: RichTextProps) {
  const html = useMemo(() => convertRichTextToHtml(text), [text])

  if (!text) {
    return null
  }

  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

