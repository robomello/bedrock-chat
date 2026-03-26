import type { ModelConfig } from "../types"

interface Props {
  models: ModelConfig[]
  selectedId: string
  onChange: (id: string) => void
  onConfigClick: () => void
}

export default function ModelSelector({
  models,
  selectedId,
  onChange,
  onConfigClick,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.display_name}
          </option>
        ))}
      </select>
      <button
        onClick={onConfigClick}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
        title="Configure models"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    </div>
  )
}
