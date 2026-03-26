import type { SSEEvent } from "../types"

/**
 * Proper SSE parser that buffers across chunk boundaries.
 * Handles multi-byte characters and split events correctly.
 */
export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: false })
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const parts = buffer.split("\n\n")
      buffer = parts.pop()!

      for (const part of parts) {
        const lines = part.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              yield JSON.parse(line.slice(6)) as SSEEvent
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    // Flush remaining decoder buffer
    buffer += decoder.decode()
    if (buffer.trim()) {
      const lines = buffer.split("\n")
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6)) as SSEEvent
          } catch {
            // Skip
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
