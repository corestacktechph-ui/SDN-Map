'use client'

import { useSession } from 'next-auth/react'
import { Activity } from 'lucide-react'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { useAppStore } from '@/store/appStore'

export function TopBar() {
  const { data: session } = useSession()
  const simulationStatus = useAppStore((s) => s.simulationStatus)

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <Activity className={`h-4 w-4 ${simulationStatus === 'running' ? 'text-green-500 animate-pulse' : 'text-green-500'}`} />
        <span className="text-xs text-green-500 font-medium">
          {simulationStatus === 'running' ? 'Simulation Active' : 'System Online'}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <NotificationDropdown />

        <div className="flex items-center gap-3 border-l pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {session?.user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.role || 'Researcher'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
