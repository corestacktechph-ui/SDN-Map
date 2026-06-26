'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testService, comparisonService } from '@/services'

export function useTests(status?: string) {
  return useQuery({
    queryKey: ['tests', status],
    queryFn: () => testService.getAll(status),
  })
}

export function useCreateTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: string; topologyId: string; sourceDeviceId?: string; targetDeviceId?: string; duration?: number }) =>
      testService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] })
    },
  })
}

export function useComparisons() {
  return useQuery({
    queryKey: ['comparisons'],
    queryFn: () => comparisonService.getAll(),
  })
}
