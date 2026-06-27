'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycles = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  const currentIndex = cycles.findIndex((c) => c.value === (theme ?? 'dark'))

  const cycleTheme = () => {
    const nextIndex = (currentIndex + 1) % cycles.length
    setTheme(cycles[nextIndex].value)
  }

  const Icon = cycles[currentIndex === -1 ? 1 : currentIndex].icon

  return (
    <button
      onClick={cycleTheme}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      title={`Theme: ${cycles[currentIndex === -1 ? 1 : currentIndex].label}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
