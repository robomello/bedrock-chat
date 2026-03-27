import type { Conversation, ConversationDetail, ModelConfig } from "../types"

const BASE = "/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  // Conversations
  listConversations: (limit = 20, offset = 0) =>
    request<Conversation[]>(`/conversations?limit=${limit}&offset=${offset}`),

  createConversation: (model_id: string, title = "New Chat", system_prompt = "") =>
    request<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ model_id, title, system_prompt }),
    }),

  getConversation: (id: string, limit = 50, offset = 0) =>
    request<ConversationDetail>(
      `/conversations/${id}?limit=${limit}&offset=${offset}`,
    ),

  updateConversation: (
    id: string,
    data: { title?: string; model_id?: string; system_prompt?: string },
  ) =>
    request<Conversation>(`/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteConversation: (id: string) =>
    request<{ ok: boolean }>(`/conversations/${id}`, { method: "DELETE" }),

  // Models
  listModels: () => request<ModelConfig[]>("/models"),

  addModel: (model: Omit<ModelConfig, "supports_streaming" | "supports_system_prompt"> & Partial<ModelConfig>) =>
    request<ModelConfig>("/models", {
      method: "POST",
      body: JSON.stringify(model),
    }),

  updateModel: (id: string, data: Partial<ModelConfig>) =>
    request<ModelConfig>(`/models/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteModel: (id: string) =>
    request<{ ok: boolean }>(`/models/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Setup
  getSetupStatus: () => request<{ setup_complete: boolean }>("/setup/status"),
  validateCredentials: () =>
    request<{ valid: boolean; error: string | null }>(
      "/setup/validate-credentials",
      { method: "POST" },
    ),

  // Health
  health: () => request<{ status: string }>("/health"),

  // Server
  shutdown: () => request<{ status: string }>("/shutdown", { method: "POST" }),
}
