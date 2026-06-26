import { create } from 'zustand'
import type { Alert } from '@/services'

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void
  unreadNotifications: number
  setUnreadNotifications: (count: number) => void
  simulationStatus: 'idle' | 'running' | 'paused'
  setSimulationStatus: (status: 'idle' | 'running' | 'paused') => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  unreadNotifications: 0,
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  simulationStatus: 'idle',
  setSimulationStatus: (status) => set({ simulationStatus: status }),
}))
