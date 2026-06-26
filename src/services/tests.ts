import { api } from './api'

export interface PerformanceTest {
  id: string
  name: string
  type: string
  status: string
  topologyId: string
  sourceDeviceId: string | null
  targetDeviceId: string | null
  duration: number | null
  config: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  results?: PerformanceResult[]
  topology?: { name: string; type: string }
}

export interface PerformanceResult {
  id: string
  testId: string
  metric: string
  value: number
  unit: string
  minValue: number | null
  maxValue: number | null
  stdDev: number | null
  sampleSize: number | null
  timestamp: string
}

export interface ComparisonResult {
  id: string
  traditionalTestId: string
  sdnTestId: string
  latencyImprovement: number | null
  throughputImprovement: number | null
  packetLossReduction: number | null
  recoveryImprovement: number | null
  jitterReduction: number | null
  summary: string | null
  createdAt: string
  traditionalTest?: PerformanceTest
  sdnTest?: PerformanceTest
}

export const testService = {
  getAll: (status?: string) => {
    const params = status ? `?status=${status}` : ''
    return api.get<PerformanceTest[]>(`/tests${params}`)
  },
  create: (data: { name: string; type: string; topologyId: string; sourceDeviceId?: string; targetDeviceId?: string; duration?: number }) =>
    api.post<PerformanceTest>('/tests', data),
  update: (id: string, data: Partial<PerformanceTest> | { action: string }) =>
    api.put<PerformanceTest>(`/tests?id=${id}`, data),
}

export const resultService = {
  getAll: () => api.get<PerformanceResult[]>('/results'),
  create: (data: { testId: string; metric: string; value: number; unit: string }) =>
    api.post<PerformanceResult>('/results', data),
}

export const comparisonService = {
  getAll: () => api.get<ComparisonResult[]>('/comparison'),
  create: (data: {
    traditionalTestId: string
    sdnTestId: string
    latencyImprovement?: number
    throughputImprovement?: number
    packetLossReduction?: number
    recoveryImprovement?: number
    jitterReduction?: number
    summary?: string
  }) => api.post<ComparisonResult>('/comparison', data),
}
