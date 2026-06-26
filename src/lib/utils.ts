import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const accentColors = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
} as const

export type AccentColor = keyof typeof accentColors

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export function formatLatency(ms: number): string {
  return `${ms.toFixed(2)} ms`
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export function calculateImprovement(traditional: number, sdn: number): number {
  if (traditional === 0) return 0
  return ((traditional - sdn) / traditional) * 100
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ONLINE: 'text-green-500',
    OFFLINE: 'text-red-500',
    WARNING: 'text-yellow-500',
    ERROR: 'text-red-600',
    CONNECTED: 'text-green-500',
    DISCONNECTED: 'text-red-500',
    INSTALLED: 'text-blue-500',
    PENDING: 'text-yellow-500',
    RUNNING: 'text-blue-500',
    COMPLETED: 'text-green-500',
    FAILED: 'text-red-500',
  }
  return colors[status] || 'text-gray-500'
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    ONLINE: 'bg-green-500',
    OFFLINE: 'bg-red-500',
    WARNING: 'bg-yellow-500',
    ERROR: 'bg-red-600',
    CONNECTED: 'bg-green-500',
    DISCONNECTED: 'bg-red-500',
  }
  return colors[status] || 'bg-gray-500'
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-red-600',
    HIGH: 'text-red-500',
    MEDIUM: 'text-yellow-500',
    LOW: 'text-blue-500',
    INFO: 'text-gray-500',
  }
  return colors[severity] || 'text-gray-500'
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
