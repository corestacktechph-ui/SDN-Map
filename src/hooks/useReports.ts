'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportService } from '@/services'

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => reportService.getAll(),
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; type: string; format?: string; data?: unknown; generatedBy?: string }) =>
      reportService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
