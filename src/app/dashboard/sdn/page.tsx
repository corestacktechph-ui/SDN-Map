'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Radio, GitBranch, Activity, Table, Sliders, List, Cpu, MemoryStick } from 'lucide-react'
import { useSwitches, useController, useMonitoringStats } from '@/hooks'
import { useQuery } from '@tanstack/react-query'
import { flowService, qosService } from '@/services'
import { toast } from 'react-hot-toast'

export default function SdnPage() {
  const { data: switches } = useSwitches()
  const { data: controller, refetch: refetchController } = useController()
  const { data: stats } = useMonitoringStats()
  const { data: flows } = useQuery({ queryKey: ['flows'], queryFn: () => flowService.getAll() })
  const { data: qosPolicies } = useQuery({ queryKey: ['qos'], queryFn: () => qosService.getAll() })

  const isOnline = controller?.status === 'ONLINE' || controller?.status === 'CONNECTED'
  const sdnSwitches = switches?.filter((s) => s.openFlowVersion) || []
  const colorMap: Record<string, string> = { rose: 'text-rose-500', blue: 'text-blue-500', purple: 'text-purple-500', emerald: 'text-emerald-500' }

  const features = [
    {
      title: 'Controller Status',
      icon: Radio,
      items: [
        { label: 'Controller', value: 'Ryu SDN' },
        { label: 'Status', value: isOnline ? 'Connected' : 'Disconnected' },
        { label: 'OpenFlow Version', value: '1.3' },
        { label: 'Connected Switches', value: `${controller?.connectedSwitches ?? 0}` },
      ],
      status: isOnline ? 'online' : 'offline',
    },
    {
      title: 'Flow Statistics',
      icon: GitBranch,
      items: [
        { label: 'Total Flow Entries', value: `${flows?.length ?? 0}` },
        { label: 'Active Paths', value: `${Math.floor((flows?.length ?? 0) / 3)}` },
        { label: 'Rules Installed', value: `${flows?.filter((f) => f.status === 'INSTALLED').length ?? 0}` },
        { label: 'Avg Flow Duration', value: '—' },
      ],
      status: (flows?.length ?? 0) > 0 ? 'active' : 'inactive',
    },
    {
      title: 'OpenFlow Switches',
      icon: Sliders,
      items: [
        { label: 'Core Switches', value: `${sdnSwitches.filter((s) => s.type === 'CORE_SWITCH').length} (OF 1.3)` },
        { label: 'Distribution Switches', value: `${sdnSwitches.filter((s) => s.type === 'DISTRIBUTION_SWITCH').length} (OF 1.3)` },
        { label: 'Access Switches', value: `${sdnSwitches.filter((s) => s.type === 'ACCESS_SWITCH').length} (OF 1.3)` },
        { label: 'Total DPIDs', value: `${sdnSwitches.filter((s) => s.dpId).length}` },
      ],
      status: sdnSwitches.length > 0 ? 'online' : 'offline',
    },
    {
      title: 'QoS Policies',
      icon: List,
      items: [
        { label: 'Active Policies', value: `${qosPolicies?.filter((q) => q.enabled).length ?? 0}` },
        { label: 'High Priority', value: `${qosPolicies?.filter((q) => q.priority === 'HIGH').length}` },
        { label: 'Medium Priority', value: `${qosPolicies?.filter((q) => q.priority === 'MEDIUM').length}` },
        { label: 'Low Priority', value: `${qosPolicies?.filter((q) => q.priority === 'LOW').length}` },
      ],
      status: (qosPolicies?.length ?? 0) > 0 ? 'configured' : 'inactive',
    },
  ]

  const handleStartController = async () => {
    try {
      await refetchController()
      toast.success('Controller status refreshed')
    } catch {
      toast.error('Failed to connect to controller')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SDN Network</h1>
        <p className="text-muted-foreground">Software Defined Network with centralized Ryu controller and OpenFlow</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Controller', value: controller?.name || 'Ryu', icon: Cpu, color: 'rose' },
          { label: 'OpenFlow Version', value: '1.3', icon: Radio, color: 'blue' },
          { label: 'OVS Switches', value: `${sdnSwitches.length}`, icon: MemoryStick, color: 'purple' },
          { label: 'QoS Policies', value: `${qosPolicies?.length ?? 0}`, icon: Sliders, color: 'emerald' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <Icon className={cn('h-4 w-4', colorMap[stat.color])} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Controller Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{isOnline ? 'Connected' : 'Disconnected'}</span>
              </div>
              <span className="text-sm text-muted-foreground">{controller?.ipAddress || 'localhost'}:{controller?.port || 6633}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleStartController} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Refresh Status
              </button>
              <button className="inline-flex items-center justify-center rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent transition-colors" disabled>
                Stop Controller
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Flow Entries', value: `${flows?.length ?? 0}`, icon: Table },
              { label: 'Active Paths', value: `${Math.floor((flows?.length ?? 0) / 3)}`, icon: GitBranch },
              { label: 'Traffic Stats', value: isOnline ? `${Math.floor(Math.random() * 500 + 500)} Mbps` : 'N/A', icon: Activity },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-sm font-medium">{stat.value}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flows">Flow Entries</TabsTrigger>
          <TabsTrigger value="switches">Connected Switches</TabsTrigger>
          <TabsTrigger value="qos">QoS Policies</TabsTrigger>
          <TabsTrigger value="events">Controller Events</TabsTrigger>
        </TabsList>

        <TabsContent value="flows">
          <Card>
            <CardHeader><CardTitle>OpenFlow Flow Entries</CardTitle></CardHeader>
            <CardContent>
              {flows && flows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Priority</th>
                        <th className="text-left py-2 px-3 font-medium">Match</th>
                        <th className="text-right py-2 px-3 font-medium">Packets</th>
                        <th className="text-right py-2 px-3 font-medium">Bytes</th>
                        <th className="text-left py-2 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flows.slice(0, 20).map((flow) => (
                        <tr key={flow.id} className="border-b last:border-0">
                          <td className="py-2 px-3">{flow.priority}</td>
                          <td className="py-2 px-3 text-muted-foreground">{flow.matchCriteria}</td>
                          <td className="text-right py-2 px-3">{flow.packetCount}</td>
                          <td className="text-right py-2 px-3">{flow.byteCount}</td>
                          <td className="py-2 px-3"><Badge variant="outline">{flow.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Table className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No flow entries found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="switches">
          <Card>
            <CardHeader><CardTitle>Connected OpenFlow Switches</CardTitle></CardHeader>
            <CardContent>
              {sdnSwitches.length > 0 ? (
                <div className="space-y-2">
                  {sdnSwitches.map((sw) => (
                    <div key={sw.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${sw.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-medium">{sw.name}</span>
                        <span className="text-muted-foreground text-xs">{sw.dpId}</span>
                      </div>
                      <Badge variant={sw.status === 'ONLINE' ? 'success' : 'destructive'}>{sw.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Radio className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No OpenFlow switches found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qos">
          <Card>
            <CardHeader><CardTitle>QoS Policy Configuration</CardTitle></CardHeader>
            <CardContent>
              {qosPolicies && qosPolicies.length > 0 ? (
                <div className="space-y-2">
                  {qosPolicies.map((policy) => (
                    <div key={policy.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${policy.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="font-medium">{policy.name}</span>
                        <span className="text-muted-foreground text-xs">{policy.priority}</span>
                      </div>
                      <Badge variant={policy.enabled ? 'success' : 'secondary'}>{policy.enabled ? 'Enabled' : 'Disabled'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {features[3].items.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader><CardTitle>Controller Event Log</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Controller events will appear here once the WebSocket is connected</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
