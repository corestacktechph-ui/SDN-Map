import { api } from './api'

export interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export const userService = {
  getAll: () => api.get<User[]>('/users'),
  delete: (id: string) => api.delete(`/users?id=${id}`),
}
