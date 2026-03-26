import { useState } from "react"

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function SystemPromptInput({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <span
          className="transition-transform"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0)" }}
        >
          &#9654;
        </span>
        System Prompt
        {value ? (
          <span className="ml-1 rounded bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[var(--color-accent)]">
            Active
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div className="px-4 pb-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter a system prompt to customize model behavior..."
            rows={3}
            className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      ) : null}
    </div>
  )
}
