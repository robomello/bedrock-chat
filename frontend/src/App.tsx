import { useCallback, useEffect, useState } from "react"
import ChatArea from "./components/ChatArea"
import ChatInput from "./components/ChatInput"
import ConfigPanel from "./components/ConfigPanel"
import ModelSelector from "./components/ModelSelector"
import SetupScreen from "./components/SetupScreen"
import Sidebar from "./components/Sidebar"
import SystemPromptInput from "./components/SystemPromptInput"
import { useChat } from "./hooks/useChat"
import { useConversations } from "./hooks/useConversations"
import { useModels } from "./hooks/useModels"
import { api } from "./services/api"

export default function App() {
  const [setupDone, setSetupDone] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState("")

  const {
    models,
    selectedModelId,
    setSelectedModelId,
    addModel,
    updateModel,
    deleteModel,
  } = useModels()

  const {
    conversations,
    createConversation,
    deleteConversation,
    updateConversation,
    loadMessages,
    refresh: refreshConversations,
  } = useConversations()

  const {
    messages,
    isStreaming,
    conversationId,
    sendMessage,
    stopGeneration,
    switchConversation,
    setMessages,
  } = useChat()

  // Check setup status on mount
  useEffect(() => {
    api
      .getSetupStatus()
      .then((s) => setSetupDone(s.setup_complete))
      .catch(() => setSetupDone(true)) // Assume setup done if API fails
  }, [])

  const handleSelectConversation = useCallback(
    async (convId: string) => {
      switchConversation(convId)
      try {
        const msgs = await loadMessages(convId)
        setMessages(msgs)
        const conv = conversations.find((c) => c.id === convId)
        if (conv) {
          setSystemPrompt(conv.system_prompt)
          setSelectedModelId(conv.model_id)
        }
      } catch (e) {
        console.error("Failed to load conversation:", e)
      }
    },
    [
      switchConversation,
      loadMessages,
      setMessages,
      conversations,
      setSelectedModelId,
    ],
  )

  const handleSend = useCallback(
    async (content: string) => {
      let convId = conversationId
      if (!convId) {
        const conv = await createConversation(selectedModelId, systemPrompt)
        convId = conv.id
      }
      await sendMessage(content, selectedModelId, convId)
      await refreshConversations()
    },
    [
      conversationId,
      selectedModelId,
      systemPrompt,
      createConversation,
      sendMessage,
      refreshConversations,
    ],
  )

  const handleNewChat = useCallback(() => {
    switchConversation("")
    setMessages([])
    setSystemPrompt("")
  }, [switchConversation, setMessages])

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      await deleteConversation(convId)
      if (conversationId === convId) {
        handleNewChat()
      }
    },
    [deleteConversation, conversationId, handleNewChat],
  )

  const handleSystemPromptChange = useCallback(
    async (value: string) => {
      setSystemPrompt(value)
      if (conversationId) {
        await updateConversation(conversationId, { system_prompt: value })
      }
    },
    [conversationId, updateConversation],
  )

  // Loading state
  if (setupDone === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    )
  }

  // Setup screen
  if (!setupDone) {
    return <SetupScreen onComplete={() => setSetupDone(true)} />
  }

  return (
    <div className="flex h-screen w-full">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
          <ModelSelector
            models={models}
            selectedId={selectedModelId}
            onChange={setSelectedModelId}
            onConfigClick={() => setConfigOpen(true)}
          />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] md:hidden"
          >
            &#9776;
          </button>
        </header>

        {/* System prompt */}
        <SystemPromptInput
          value={systemPrompt}
          onChange={handleSystemPromptChange}
        />

        {/* Messages */}
        <ChatArea messages={messages} isStreaming={isStreaming} />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onStop={stopGeneration}
          isStreaming={isStreaming}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Config panel */}
      <ConfigPanel
        models={models}
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        onAdd={addModel}
        onUpdate={updateModel}
        onDelete={deleteModel}
      />
    </div>
  )
}
