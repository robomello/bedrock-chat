import { useEffect, useRef } from "react"
import type { Message } from "../types"

export function useAutoScroll(messages: Message[], isStreaming: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (isNearBottom || isStreaming) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isStreaming])

  return ref
}
