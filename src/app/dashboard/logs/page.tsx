'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollText, Filter, Trash2, RefreshCw, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react'
import { useLogs } from '@/hooks'
import { useQueryClient } from '@tanstack/react-query'

const getLevelIcon = (action: string) => {
  const level = action.toLowerCase()
  if (level.includes('error') || level.includes('fail')) return <XCircle className="h-4 w-4 text-red-500" />
  if (level.includes('warn')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  if (level.includes('success') || level.includes('complete')) return <CheckCircle2 className="h-4 w-4 text-green-500" />
  return <Info className="h-4 w-4 text-blue-500" />
}

const getLevel = (action: string) => {
  const l = action.toLowerCase()
  if (l.includes('error') || l.includes('fail')) return 'error'
  if (l.includes('warn')) return 'warn'
  if (l.includes('success') || l.includes('complete')) return 'success'
  return 'info'
}

export default function LogsPage() {
  const [filter, setFilter] = useState<string>('all')
  const { data: logs, isLoading } = useLogs()
  const queryClient = useQueryClient()

  const filteredLogs = filter === 'all' ? logs : logs?.filter((l) => getLevel(l.action) === filter)

  const stats = logs?.reduce(
    (acc, log) => {
      const level = getLevel(log.action)
      if (level === 'info') acc.info++
      else if (level === 'warn') acc.warn++
      else if (level === 'error') acc.error++
      else if (level === 'success') acc.success++
      return acc
    },
    { info: 0, warn: 0, error: 0, success: 0 }
  ) || { info: 0, warn: 0, error: 0, success: 0 }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">Monitor system events and controller logs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Event Log</CardTitle>
            <div className="flex gap-1 ml-auto">
              {['all', 'info', 'warn', 'error', 'success'].map((level) => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${filter === level ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-input hover:bg-accent'}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              filteredLogs.map((log, i) => (
                <div key={log.id || i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  {getLevelIcon(log.action)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.details || log.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{log.entity || 'system'}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                      {log.user && <span className="text-[10px] text-muted-foreground">by {log.user.name}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>{filter === 'all' ? 'No logs found' : `No ${filter} logs found`}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Info', count: stats.info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Warnings', count: stats.warn, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
              { label: 'Errors', count: stats.error, color: 'text-red-500', bg: 'bg-red-500/10' },
              { label: 'Success', count: stats.success, color: 'text-green-500', bg: 'bg-green-500/10' },
            ].map((stat) => (
              <div key={stat.label} className={`text-center rounded-lg ${stat.bg} p-4`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
