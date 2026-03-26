import type { Conversation } from "../types"

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onToggle,
}: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-transform md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Chat History
          </h2>
          <button
            onClick={onToggle}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] md:hidden"
          >
            &#10005;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group mb-1 flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                conv.id === activeId
                  ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <span className="flex-1 truncate">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(conv.id)
                }}
                className="ml-2 hidden rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/20 hover:text-[var(--color-error)] group-hover:block"
                title="Delete conversation"
              >
                &#128465;
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] p-3">
          <button
            onClick={onNew}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            + New Chat
          </button>
        </div>
      </aside>
    </>
  )
}
