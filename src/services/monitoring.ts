import { api } from './api'

export interface MonitoringStats {
  totalDevices: number
  onlineDevices: number
  totalSwitches: number
  totalHosts: number
  totalVlans: number
  activeAlerts: number
  recentEvents: number
  activeSessions: number
  controllerStatus: string
}

export interface ControllerInfo {
  id: string
  name: string
  type: string
  ipAddress: string
  port: number
  restApiPort: number
  status: string
  version: string | null
  uptime: number | null
  connectedSwitches: number
  flowCount: number
}

export interface LogEntry {
  id: string
  action: string
  entity: string | null
  entityId: string | null
  details: string | null
  userId: string | null
  user?: { name: string; email: string } | null
  createdAt: string
}

export const monitoringService = {
  getStats: () => api.get<MonitoringStats>('/monitoring'),
  getController: () => api.get<ControllerInfo | null>('/controller'),
  updateController: (data: { name?: string; ipAddress?: string; port?: number; restApiPort?: number }) =>
    api.post<ControllerInfo>('/controller', data),
  deleteController: () => api.delete('/controller'),
}

export const logService = {
  getAll: () => api.get<LogEntry[]>('/logs'),
  create: (data: { action: string; entity?: string; entityId?: string; details?: string; userId?: string }) =>
    api.post<LogEntry>('/logs', data),
}
