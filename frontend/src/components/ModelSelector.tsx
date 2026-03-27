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
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </button>
    </div>
  )
}
