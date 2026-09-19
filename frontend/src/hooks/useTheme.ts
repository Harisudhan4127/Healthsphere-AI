import { useEffect, useState } from 'react'

const THEME_KEY = 'healthsphere_theme'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  function toggle() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggle }
}