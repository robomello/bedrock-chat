import { useCallback, useEffect, useState } from "react"
import { api } from "../services/api"
import type { Conversation, Message } from "../types"

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.listConversations()
      setConversations(data)
    } catch (e) {
      console.error("Failed to load conversations:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  const createConversation = async (
    modelId: string,
    systemPrompt = "",
  ): Promise<Conversation> => {
    const conv = await api.createConversation(modelId, "New Chat", systemPrompt)
    setConversations((prev) => [conv, ...prev])
    return conv
  }

  const deleteConversation = async (id: string) => {
    await api.deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  const updateConversation = async (
    id: string,
    data: { title?: string; model_id?: string; system_prompt?: string },
  ) => {
    const updated = await api.updateConversation(id, data)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? updated : c)),
    )
    return updated
  }

  const loadMessages = async (
    conversationId: string,
  ): Promise<Message[]> => {
    const detail = await api.getConversation(conversationId)
    return detail.messages.map((m) => ({
      ...m,
      id: m.id,
      role: m.role as "user" | "assistant",
    }))
  }

  return {
    conversations,
    loading,
    createConversation,
    deleteConversation,
    updateConversation,
    loadMessages,
    refresh: loadConversations,
  }
}
