'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Network,
  Server,
  Radio,
  FlaskConical,
  BarChart3,
  FileText,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users,
  AlertTriangle,
  Wrench,
  ArrowRight,
  ClipboardCheck,
  BrainCircuit,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useAppStore } from '@/store/appStore'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/topology', label: 'Topology', icon: Network },
  { href: '/dashboard/traditional', label: 'Traditional', icon: Server },
  { href: '/dashboard/sdn', label: 'SDN Network', icon: Radio },
  { href: '/dashboard/manageability', label: 'Manageability', icon: Wrench },
  { href: '/dashboard/migration', label: 'Migration Model', icon: ArrowRight },
  { href: '/dashboard/readiness', label: 'Readiness', icon: ClipboardCheck },
  { href: '/dashboard/decision-support', label: 'Decision Support', icon: BrainCircuit },
  { href: '/dashboard/testing', label: 'Testing', icon: FlaskConical },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/logs', label: 'System Logs', icon: ScrollText },
  { href: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === 'ADMIN'
  const items = isAdmin ? [...menuItems, { href: '/dashboard/users', label: 'Users', icon: Users }] : menuItems

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-muted bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-muted px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Activity className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground">
            SDN Migration
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-muted p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors mt-1"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
