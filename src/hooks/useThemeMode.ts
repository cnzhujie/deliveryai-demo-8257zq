import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'theme-mode'

export type ThemeMode = 'system' | 'light' | 'dark'

/**
 * 主题模式管理 hook（三态：system / light / dark）。
 * 优先级：localStorage > 默认 system。
 * localStorage 不可用时降级为内存态，不报错不阻塞。
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const initial = getInitialThemeMode()
    applyThemeMode(initial)
    return initial
  })

  // 监听系统主题变化（仅 mode=system 时跟随）
  useEffect(() => {
    if (mode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeMode('system')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [mode])

  useEffect(() => {
    applyThemeMode(mode)
  }, [mode])

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage 不可用时降级为内存态，不报错
      }
      return next
    })
  }, [])

  return { mode, cycle }
}

function getInitialThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'system' || stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage 不可用时降级为默认 system
  }
  return 'system'
}

function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  let shouldDark = false
  if (mode === 'dark') shouldDark = true
  else if (mode === 'system') {
    shouldDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  }
  root.classList.toggle('dark', shouldDark)
}
