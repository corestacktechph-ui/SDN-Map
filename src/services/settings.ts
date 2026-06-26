import { api } from './api'

export interface AppSettings {
  darkMode: boolean
  autoRefresh: boolean
  monitoringInterval: number
  notifications: boolean
  soundAlerts: boolean
  emailReports: boolean
  ryuHost: string
  ryuPort: number
  restApiPort: number
  networkCidr: string
}

const SETTINGS_KEY = 'app_settings'

export const settingsService = {
  get: (): AppSettings => {
    if (typeof window === 'undefined') return defaultSettings
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings
    } catch {
      return defaultSettings
    }
  },
  save: (settings: AppSettings): AppSettings => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return settings
  },
}

export const defaultSettings: AppSettings = {
  darkMode: true,
  autoRefresh: true,
  monitoringInterval: 1000,
  notifications: true,
  soundAlerts: false,
  emailReports: false,
  ryuHost: 'localhost',
  ryuPort: 6633,
  restApiPort: 8080,
  networkCidr: '10.0.0.0/16',
}
