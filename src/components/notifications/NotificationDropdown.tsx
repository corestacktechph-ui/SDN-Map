'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService, alertService, type Notification, type Alert } from '@/services'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
    refetchInterval: 30000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertService.getAll(),
    refetchInterval: 30000,
  })

  const unreadCount = (notifications?.filter((n) => !n.read).length || 0) + (alerts?.filter((a) => !a.acknowledged).length || 0)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    if (notifications) {
      for (const n of notifications) {
        if (!n.read) await notificationService.markRead(n.id)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
  }

  const allItems: Array<{ id: string; title: string; message: string; type: string; read: boolean; createdAt: string }> = [
    ...(alerts?.map((a) => ({ id: a.id, title: a.title, message: a.message, type: a.severity, read: a.acknowledged, createdAt: a.createdAt })) || []),
    ...(notifications?.map((n) => ({ id: n.id, title: n.title, message: n.message, type: n.type, read: n.read, createdAt: n.createdAt })) || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {allItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              allItems.slice(0, 20).map((item) => (
                <div key={item.id} className={cn('flex items-start gap-3 border-b p-3 text-sm hover:bg-accent/50 transition-colors', !item.read && 'bg-blue-500/5')}>
                  <div className={cn(
                    'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                    item.type === 'CRITICAL' || item.type === 'ERROR' ? 'bg-red-500' :
                    item.type === 'HIGH' || item.type === 'WARN' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  {!item.read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
