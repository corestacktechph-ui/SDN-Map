'use client'

import { useQuery } from '@tanstack/react-query'
import { monitoringService, logService } from '@/services'

export function useMonitoringStats() {
  return useQuery({
    queryKey: ['monitoring'],
    queryFn: () => monitoringService.getStats(),
    refetchInterval: 10000,
  })
}

export function useController() {
  return useQuery({
    queryKey: ['controller'],
    queryFn: () => monitoringService.getController(),
    refetchInterval: 15000,
  })
}

export function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: () => logService.getAll(),
    refetchInterval: 30000,
  })
}
