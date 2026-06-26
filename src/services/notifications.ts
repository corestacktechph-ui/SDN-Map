import { api } from './api'

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  userId: string
  createdAt: string
}

export interface Alert {
  id: string
  title: string
  message: string
  severity: string
  source: string | null
  acknowledged: boolean
  resolved: boolean
  createdAt: string
  resolvedAt: string | null
}

export const notificationService = {
  getAll: () => api.get<Notification[]>('/notifications'),
  markRead: (id: string) => api.put(`/notifications?id=${id}`, { read: true }),
}

export const alertService = {
  getAll: () => api.get<Alert[]>('/alerts'),
  acknowledge: (id: string) => api.put(`/alerts?id=${id}`, { acknowledged: true }),
  resolve: (id: string) => api.put(`/alerts?id=${id}`, { resolved: true }),
}
