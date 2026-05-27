'use client'

import { useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark'

/**
 * useTheme - reads/writes the `.dark` class on <html>, persists to localStorage.
 * The initial value is read from the DOM (set by the init script in <head>)
 * to avoid hydration mismatches.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')
  }, [])

  const setTheme = useCallback((next: Theme) => {
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    try { localStorage.setItem('rb-theme', next) } catch {}
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
