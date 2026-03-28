import { useRef, useState } from "react"
import type { Attachment } from "../types"

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

const ACCEPTED = ".png,.jpg,.jpeg,.gif,.webp,.pdf"

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? "") // strip data:...;base64,
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: Props) {
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<Attachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = input.trim()
    if ((!trimmed && files.length === 0) || isStreaming || disabled) return
    onSend(trimmed || "Describe this file.", files)
    setInput("")
    setFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const newFiles: Attachment[] = []
    for (const file of Array.from(selected)) {
      const data = await toBase64(file)
      newFiles.push({ name: file.name, type: file.type, data })
    }
    setFiles((prev) => [...prev, ...newFiles])
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mx-auto max-w-3xl">
        {/* File previews */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]"
              >
                {f.type.startsWith("image/") ? (
                  <img
                    src={`data:${f.type};base64,${f.data}`}
                    alt={f.name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || isStreaming}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-30"
            title="Attach files"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="rounded-xl bg-[var(--color-error)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-error)]/80 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!input.trim() && files.length === 0) || disabled}
              className="rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
