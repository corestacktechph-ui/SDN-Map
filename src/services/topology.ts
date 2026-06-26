import { api } from './api'
import type { TopologyNode, TopologyLink } from '@/types'

export interface TopologyData {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
  devices: TopologyNode[]
  networkEvents: unknown[]
  createdAt: string
}

export const topologyService = {
  getAll: () => api.get<TopologyData[]>('/topology'),
  getById: (id: string) => api.get<TopologyData>(`/topology?id=${id}`),
  create: (data: { name: string; type: string; description?: string; isActive?: boolean }) =>
    api.post<TopologyData>('/topology', data),
  update: (id: string, data: Partial<TopologyData>) =>
    api.put<TopologyData>(`/topology?id=${id}`, data),
}

export const deviceService = {
  getAll: () => api.get<Array<{ id: string; name: string; type: string; status: string; ipAddress: string | null; topologyId: string }>>('/devices'),
  getSwitches: () => api.get<Array<{ id: string; name: string; type: string; status: string; ipAddress: string | null; dpId?: string | null; openFlowVersion?: string | null; flowEntries?: unknown[] }>>('/switches'),
  getHosts: () => api.get<Array<{ id: string; name: string; type: string; status: string; ipAddress: string | null }>>('/hosts'),
}

export const flowService = {
  getAll: () => api.get<Array<{ id: string; priority: number; matchCriteria: string; instructions: string; byteCount: number; packetCount: number; status: string; deviceId: string }>>('/flows'),
  create: (data: { priority?: number; matchCriteria: string; instructions: string; deviceId: string }) =>
    api.post('/flows', data),
}

export const qosService = {
  getAll: () => api.get<Array<{ id: string; name: string; description: string | null; priority: string; enabled: boolean }>>('/qos'),
  create: (data: { name: string; priority: string; description?: string }) =>
    api.post('/qos', data),
  update: (id: string, data: Partial<{ name: string; priority: string; enabled: boolean }>) =>
    api.put(`/qos?id=${id}`, data),
}
