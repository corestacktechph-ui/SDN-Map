'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
