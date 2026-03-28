import { useState } from "react"
import Markdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import type { Message } from "../types"

interface Props {
  message: Message
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 rounded bg-white/10 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-white/20 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          message.isError
            ? "bg-[var(--color-error)]/20 border border-[var(--color-error)]/40"
            : isUser
              ? "bg-[var(--color-user-bubble)]"
              : "bg-[var(--color-assistant-bubble)]"
        }`}
      >
        {isUser ? (
          <div>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {message.attachments.map((att, i) =>
                  att.type.startsWith("image/") ? (
                    <img
                      key={i}
                      src={`data:${att.type};base64,${att.data}`}
                      alt={att.name}
                      className="max-h-48 rounded-lg border border-[var(--color-border)]"
                    />
                  ) : (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-xs"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {att.name}
                    </div>
                  ),
                )}
              </div>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            <Markdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className ?? "")
                  const codeStr = String(children).replace(/\n$/, "")
                  if (match) {
                    return (
                      <div className="relative">
                        <CopyButton text={codeStr} />
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code
                      className="rounded bg-white/10 px-1.5 py-0.5 text-[var(--color-accent)]"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
              }}
            >
              {message.content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  )
}
