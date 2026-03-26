import { useState } from "react"
import type { ModelConfig } from "../types"

interface Props {
  models: ModelConfig[]
  isOpen: boolean
  onClose: () => void
  onAdd: (model: ModelConfig) => void
  onUpdate: (id: string, data: Partial<ModelConfig>) => void
  onDelete: (id: string) => void
}

export default function ConfigPanel({
  models,
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    id: "",
    display_name: "",
    provider: "",
    max_tokens: 8192,
  })

  if (!isOpen) return null

  const handleAdd = () => {
    if (!form.id || !form.display_name || !form.provider) return
    onAdd({
      ...form,
      supports_streaming: true,
      supports_system_prompt: true,
    })
    setForm({ id: "", display_name: "", provider: "", max_tokens: 8192 })
    setIsAdding(false)
  }

  const handleUpdate = () => {
    if (!editingId) return
    onUpdate(editingId, {
      display_name: form.display_name,
      provider: form.provider,
      max_tokens: form.max_tokens,
    })
    setEditingId(null)
    setForm({ id: "", display_name: "", provider: "", max_tokens: 8192 })
  }

  const startEdit = (m: ModelConfig) => {
    setEditingId(m.id)
    setForm({
      id: m.id,
      display_name: m.display_name,
      provider: m.provider,
      max_tokens: m.max_tokens,
    })
    setIsAdding(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Model Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            &#10005;
          </button>
        </div>

        <div className="mb-4 max-h-60 overflow-y-auto">
          {models.map((m) => (
            <div
              key={m.id}
              className="mb-2 flex items-center justify-between rounded-lg bg-[var(--color-bg-primary)] px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {m.display_name}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {m.provider} &middot; {m.max_tokens} tokens
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(m)}
                  className="rounded px-2 py-1 text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  className="rounded px-2 py-1 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {isAdding || editingId ? (
          <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
            {isAdding ? (
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="Model ID (e.g., us.meta.llama4-maverick-17b-instruct-v1:0)"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:outline-none"
              />
            ) : null}
            <input
              value={form.display_name}
              onChange={(e) =>
                setForm({ ...form, display_name: e.target.value })
              }
              placeholder="Display Name"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="Provider"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              type="number"
              value={form.max_tokens}
              onChange={(e) =>
                setForm({ ...form, max_tokens: Number(e.target.value) })
              }
              placeholder="Max Tokens"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                {editingId ? "Update" : "Add"}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setEditingId(null)
                  setForm({
                    id: "",
                    display_name: "",
                    provider: "",
                    max_tokens: 8192,
                  })
                }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full rounded-lg border border-dashed border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            + Add Model
          </button>
        )}
      </div>
    </div>
  )
}
