'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Route, Shield, Network, Server, Table, Activity, Wifi, ArrowLeftRight, Database } from 'lucide-react'
import { useSwitches, useTopologies, useHosts } from '@/hooks'

export default function TraditionalPage() {
  const { data: switches } = useSwitches()
  const { data: topologies } = useTopologies()
  const { data: hosts } = useHosts()

  const tradTopology = topologies?.find((t) => t.type === 'TRADITIONAL')
  const coreSwitches = switches?.filter((s) => s.type === 'CORE_SWITCH') || []
  const distSwitches = switches?.filter((s) => s.type === 'DISTRIBUTION_SWITCH') || []
  const accessSwitches = switches?.filter((s) => s.type === 'ACCESS_SWITCH') || []
  const servers = hosts?.filter((h) => h.type === 'SERVER') || []
  const onlineCount = [...(switches || []), ...(hosts || [])].filter((d) => d.status === 'ONLINE').length
  const colorMap: Record<string, string> = { blue: 'text-blue-500', purple: 'text-purple-500', emerald: 'text-emerald-500', amber: 'text-amber-500' }

  const features = [
    {
      title: 'OSPF Routing',
      icon: Route,
      items: [
        { label: 'Protocol', value: 'OSPFv2' },
        { label: 'Area', value: 'Area 0 (Backbone)' },
        { label: 'Neighbors', value: `${Math.min(coreSwitches.length, 4)} established` },
        { label: 'Routes', value: `${Math.min(coreSwitches.length * 12, 24)} learned` },
      ],
      status: coreSwitches.some((s) => s.status === 'ONLINE') ? 'active' : 'inactive',
    },
    {
      title: 'VRRP Redundancy',
      icon: Shield,
      items: [
        { label: 'Virtual IP', value: '10.0.0.254' },
        { label: 'Master Router', value: 'CS1 (Priority 100)' },
        { label: 'Backup Router', value: 'CS2 (Priority 90)' },
        { label: 'State', value: coreSwitches.some((s) => s.status === 'ONLINE') ? 'Active' : 'Inactive' },
      ],
      status: coreSwitches.some((s) => s.status === 'ONLINE') ? 'active' : 'inactive',
    },
    {
      title: 'VLAN Configuration',
      icon: Network,
      items: [
        { label: 'Active VLANs', value: '14' },
        { label: 'User VLANs', value: '6 (10-60)' },
        { label: 'Guest VLANs', value: '3 (110-130)' },
        { label: 'Services VLANs', value: '4 (91-94)' },
      ],
      status: 'configured',
    },
    {
      title: 'DHCP Services',
      icon: Server,
      items: [
        { label: 'DHCP Server', value: '10.0.5.10' },
        { label: 'Active Leases', value: `${onlineCount}` },
        { label: 'Scope', value: '10.0.0.0/16' },
        { label: 'Lease Duration', value: '24 hours' },
      ],
      status: onlineCount > 0 ? 'active' : 'inactive',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Traditional Network</h1>
        <p className="text-muted-foreground">Traditional hierarchical LAN architecture with distributed control plane</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Core Switches', value: coreSwitches.length.toString(), icon: Network, color: 'blue' },
          { label: 'Distribution Switches', value: distSwitches.length.toString(), icon: ArrowLeftRight, color: 'purple' },
          { label: 'Access Switches', value: accessSwitches.length.toString(), icon: Wifi, color: 'emerald' },
          { label: 'Routing Protocols', value: 'OSPF, VRRP', icon: Route, color: 'amber' },
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

      <Tabs defaultValue="protocols" className="space-y-4">
        <TabsList>
          <TabsTrigger value="protocols">Routing Protocols</TabsTrigger>
          <TabsTrigger value="vlans">VLANs</TabsTrigger>
          <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
        </TabsList>

        <TabsContent value="protocols" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {features.slice(0, 2).map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant={feature.status === 'active' ? 'success' : 'destructive'} className="ml-auto">{feature.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {feature.items.map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="vlans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {features.slice(2, 4).map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant={feature.status === 'active' ? 'success' : 'destructive'} className="ml-auto">{feature.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {feature.items.map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="interfaces">
          <Card>
            <CardHeader><CardTitle>Interface Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...coreSwitches, ...distSwitches, ...accessSwitches].map((sw) => (
                  <div key={sw.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${sw.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-medium">{sw.name}</span>
                      <span className="text-muted-foreground text-xs">{sw.ipAddress || '—'}</span>
                    </div>
                    <Badge variant={sw.status === 'ONLINE' ? 'success' : 'destructive'}>{sw.status}</Badge>
                  </div>
                ))}
                {switches?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p>No switches found in the database</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bandwidth">
          <Card>
            <CardHeader><CardTitle>Bandwidth Usage</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Start the traditional network simulation to view bandwidth usage</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
