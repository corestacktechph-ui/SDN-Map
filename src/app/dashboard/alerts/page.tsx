'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, XCircle, Info, Filter } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { alertService, type Alert } from '@/services'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

const severityColors: Record<string, string> = {
  CRITICAL: 'text-red-600 bg-red-500/10 border-red-500/30',
  HIGH: 'text-red-500 bg-red-500/10 border-red-500/20',
  MEDIUM: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  INFO: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
}

const severityIcons: Record<string, typeof AlertTriangle> = {
  CRITICAL: XCircle,
  HIGH: AlertTriangle,
  MEDIUM: AlertTriangle,
  LOW: Info,
  INFO: Info,
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<string>('all')
  const queryClient = useQueryClient()
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertService.getAll(),
    refetchInterval: 15000,
  })

  const filtered = filter === 'all' ? alerts : alerts?.filter((a) => a.severity === filter.toUpperCase())

  const handleAcknowledge = async (alert: Alert) => {
    try {
      await alertService.acknowledge(alert.id)
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert acknowledged')
    } catch {
      toast.error('Failed to acknowledge')
    }
  }

  const handleResolve = async (alert: Alert) => {
    try {
      await alertService.resolve(alert.id)
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert resolved')
    } catch {
      toast.error('Failed to resolve')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Monitor and manage network alerts</p>
        </div>
        <div className="flex gap-1">
          {['all', 'critical', 'high', 'medium', 'low', 'info'].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn('px-3 py-1 text-xs rounded-full border transition-colors', filter === level ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-input hover:bg-accent')}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Alert Feed</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
          ) : filtered && filtered.length > 0 ? (
            <div className="space-y-2">
              {filtered.map((alert, i) => {
                const Icon = severityIcons[alert.severity] || AlertTriangle
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn('flex items-start gap-3 rounded-lg border p-4', severityColors[alert.severity] || '')}
                  >
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge variant={alert.acknowledged ? 'success' : 'destructive'} className="text-[10px] px-1">
                          {alert.acknowledged ? 'Acknowledged' : 'New'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</span>
                        {alert.source && <Badge variant="outline" className="text-[10px]">{alert.source}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!alert.acknowledged && (
                        <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert)}>
                          Acknowledge
                        </Button>
                      )}
                      {!alert.resolved && (
                        <Button size="sm" variant="outline" className="text-green-500" onClick={() => handleResolve(alert)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="mx-auto h-12 w-12 mb-3 opacity-50 text-green-500" />
              <p>No alerts</p>
              <p className="text-sm">{filter !== 'all' ? `No ${filter} alerts found` : 'Your network is running smoothly'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
