import type { Message } from "../types"
import { useAutoScroll } from "../hooks/useAutoScroll"
import LoadingDots from "./LoadingDots"
import MessageBubble from "./MessageBubble"

interface Props {
  messages: Message[]
  isStreaming: boolean
}

export default function ChatArea({ messages, isStreaming }: Props) {
  const scrollRef = useAutoScroll(messages, isStreaming)

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold text-[var(--color-text-primary)]">
            Bedrock Chat
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Start a conversation by typing a message below.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming ? <LoadingDots /> : null}
      </div>
    </div>
  )
}
