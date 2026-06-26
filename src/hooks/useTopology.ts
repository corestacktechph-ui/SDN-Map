'use client'

import { useQuery } from '@tanstack/react-query'
import { topologyService, deviceService } from '@/services'

export function useTopologies() {
  return useQuery({
    queryKey: ['topologies'],
    queryFn: () => topologyService.getAll(),
  })
}

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getAll(),
  })
}

export function useSwitches() {
  return useQuery({
    queryKey: ['switches'],
    queryFn: () => deviceService.getSwitches(),
  })
}

export function useHosts() {
  return useQuery({
    queryKey: ['hosts'],
    queryFn: () => deviceService.getHosts(),
  })
}
