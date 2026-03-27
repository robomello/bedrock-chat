import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark" | "retro" | "system"

const VALID_THEMES: Theme[] = ["light", "dark", "retro", "system"]

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem("bedrock-chat-theme")
  if (VALID_THEMES.includes(stored as Theme)) {
    return stored as Theme
  }
  return "dark"
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme
  document.documentElement.setAttribute("data-theme", resolved)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem("bedrock-chat-theme", t)
    applyTheme(t)
  }, [])

  // Apply on mount
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (theme === "system") {
        applyTheme("system")
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  return { theme, setTheme }
}
