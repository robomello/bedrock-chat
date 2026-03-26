import { useState } from "react"
import { api } from "../services/api"

interface Props {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: Props) {
  const [status, setStatus] = useState<
    "idle" | "validating" | "success" | "error"
  >("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleValidate = async () => {
    setStatus("validating")
    setErrorMsg("")
    try {
      const result = await api.validateCredentials()
      if (result.valid) {
        setStatus("success")
        setTimeout(onComplete, 1000)
      } else {
        setStatus("error")
        setErrorMsg(result.error ?? "Validation failed")
      }
    } catch (e) {
      setStatus("error")
      setErrorMsg(e instanceof Error ? e.message : "Connection failed")
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
          Bedrock Chat
        </h1>
        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          Validate your AWS credentials to get started.
        </p>

        {status === "error" ? (
          <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
            {errorMsg}
          </div>
        ) : null}

        {status === "success" ? (
          <div className="mb-4 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 px-4 py-3 text-sm text-[var(--color-success)]">
            Credentials validated. Starting...
          </div>
        ) : null}

        <button
          onClick={handleValidate}
          disabled={status === "validating" || status === "success"}
          className="w-full rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
        >
          {status === "validating"
            ? "Validating..."
            : status === "success"
              ? "Done!"
              : "Validate AWS Credentials"}
        </button>

        <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
          Requires AWS credentials with Bedrock access configured via
          environment variables, ~/.aws/credentials, or IAM role.
        </p>
      </div>
    </div>
  )
}
