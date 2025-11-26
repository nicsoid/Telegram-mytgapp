import { FormatType } from "@/lib/richText"

const BUTTONS: Array<{ type: FormatType; label: string; title: string }> = [
  { type: "bold", label: "B", title: "Bold ([b][/b])" },
  { type: "italic", label: "I", title: "Italic ([i][/i])" },
  { type: "underline", label: "U", title: "Underline ([u][/u])" },
  { type: "strike", label: "S", title: "Strikethrough ([s][/s])" },
  { type: "code", label: "{ }", title: "Code ([code][/code])" },
  { type: "link", label: "Link", title: "Link ([link=URL]text[/link])" },
]

interface FormattingToolbarProps {
  onFormat: (type: FormatType) => void
}

export default function FormattingToolbar({ onFormat }: FormattingToolbarProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Formatting
      </span>
      {BUTTONS.map((button) => (
        <button
          key={button.type}
          type="button"
          onClick={() => onFormat(button.type)}
          title={button.title}
          className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
        >
          {button.label}
        </button>
      ))}
      <span className="ml-auto text-xs text-gray-400">
        Available tags: [b], [i], [u], [s], [code], [link]
      </span>
    </div>
  )
}

