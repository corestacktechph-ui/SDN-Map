import { api } from './api'

export interface Report {
  id: string
  title: string
  type: string
  format: string
  data: string | null
  fileUrl: string | null
  generatedBy: string | null
  createdAt: string
}

export const reportService = {
  getAll: () => api.get<Report[]>('/reports'),
  create: (data: { title: string; type: string; format?: string; data?: unknown; fileUrl?: string; generatedBy?: string }) =>
    api.post<Report>('/reports', data),
}
