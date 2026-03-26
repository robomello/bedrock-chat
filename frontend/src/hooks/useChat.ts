import { useRef, useState } from "react"
import { parseSSEStream } from "../services/stream"
import type { Message } from "../types"

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopGeneration = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }

  const sendMessage = async (
    content: string,
    modelId: string,
    convId: string,
  ) => {
    // Abort any in-flight stream before starting new one
    abortControllerRef.current?.abort()

    setConversationId(convId)

    // Add user message (immutable)
    const userMsg: Message = {
      role: "user",
      content,
      id: crypto.randomUUID(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    // Create placeholder for assistant response
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", id: assistantId },
    ])

    // Stream via SSE with abort support
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: convId,
          model_id: modelId,
          content,
        }),
        signal: controller.signal,
      })

      for await (const event of parseSSEStream(response)) {
        if (event.type === "chunk" && event.content) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + event.content }
                : m,
            ),
          )
        } else if (event.type === "error") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: event.message ?? "Error occurred",
                    isError: true,
                  }
                : m,
            ),
          )
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Stream error:", e)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const switchConversation = (convId: string) => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setConversationId(convId)
  }

  return {
    messages,
    isStreaming,
    conversationId,
    sendMessage,
    stopGeneration,
    switchConversation,
    setMessages,
  }
}
