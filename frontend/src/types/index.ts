export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isError?: boolean
  is_complete?: boolean
  created_at?: string
}

export interface Conversation {
  id: string
  title: string
  model_id: string
  system_prompt: string
  created_at: string
  updated_at: string
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface ModelConfig {
  id: string
  display_name: string
  provider: string
  max_tokens: number
  supports_streaming: boolean
  supports_system_prompt: boolean
}

export interface SSEEvent {
  type: "chunk" | "done" | "error"
  content?: string
  message?: string
  conversation_id?: string
}
