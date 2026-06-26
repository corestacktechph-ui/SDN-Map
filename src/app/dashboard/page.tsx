'use client'

import { motion } from 'framer-motion'
import {
  Activity,
  Server,
  Monitor,
  Network,
  Radio,
  Gauge,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMonitoringStats } from '@/hooks'
import { useTests } from '@/hooks'
import { useController } from '@/hooks'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useMonitoringStats()
  const { data: tests } = useTests()
  const { data: controller } = useController()

  const isControllerOnline = controller?.status === 'ONLINE' || controller?.status === 'CONNECTED'
  const recentTests = tests?.slice(0, 5) || []
  const onlineDevices = stats?.onlineDevices ?? 0
  const totalDevices = stats?.totalDevices ?? 0
  const healthScore = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the SDN Migration Analysis Platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Devices', value: stats?.totalDevices ?? '—', icon: <Server className="h-4 w-4" />, description: 'Switches, routers, hosts & servers' },
          { title: 'Total Switches', value: stats?.totalSwitches ?? '—', icon: <Network className="h-4 w-4" />, description: 'Core, distribution & access' },
          { title: 'Total Hosts', value: stats?.totalHosts ?? '—', icon: <Monitor className="h-4 w-4" />, description: 'End devices & servers' },
          { title: 'Total VLANs', value: stats?.totalVlans ?? '—', icon: <Radio className="h-4 w-4" />, description: 'User, guest, services & mgmt' },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className="text-muted-foreground">{card.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '...' : card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Controller Status</CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={isControllerOnline ? 'success' : 'destructive'} className="capitalize">
                <span className={cn('mr-1 inline-block h-2 w-2 rounded-full', isControllerOnline ? 'bg-green-500' : 'bg-red-500')} />
                {isControllerOnline ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
        {[
          { title: 'Avg Latency', value: '— ms', icon: <Gauge className="h-4 w-4" /> },
          { title: 'Throughput', value: '— Mbps', icon: <Zap className="h-4 w-4" /> },
          { title: 'Recovery Time', value: '— ms', icon: <Clock className="h-4 w-4" /> },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (i + 1) * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className="text-muted-foreground">{card.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Network Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" opacity={0.2} />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-blue-500" strokeDasharray={`${healthScore * 2.64} ${100 * 2.64}`} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold">{healthScore || '—'}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Active Alerts</p>
                <p className="text-xl font-bold text-yellow-500">{stats?.activeAlerts ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Devices Online</p>
                <p className="text-xl font-bold text-green-500">{onlineDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Simulation Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Simulation Status</p>
                <p className="text-xs text-muted-foreground">
                  {statsLoading ? 'Loading...' : `${totalDevices} devices configured, ${onlineDevices} online`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href="/dashboard/topology" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors text-center">
                View Topology
              </a>
              <a href="/dashboard/sdn" className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors text-center">
                View SDN
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No tests have been run yet</p>
              <p className="text-sm">Navigate to the Testing Center to run performance tests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTests.map((test) => (
                <div key={test.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={test.status === 'COMPLETED' ? 'success' : test.status === 'RUNNING' ? 'default' : 'secondary'}>
                      {test.status}
                    </Badge>
                    <span className="font-medium">{test.name}</span>
                    <span className="text-muted-foreground text-xs">{test.type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(test.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
