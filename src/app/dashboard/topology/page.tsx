'use client'

import { useRef, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useSocket } from '@/hooks'
import { ZoomIn, ZoomOut, RotateCcw, Network, Layers, Activity, Server, Monitor, Radio, Zap, Wifi, ArrowUpDown, Gauge, RefreshCw } from 'lucide-react'

const FALLBACK_DEVICES = {
  core: ['CS1', 'CS2'],
  distribution: ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2', 'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2'],
  access: ['AS_A1', 'AS_B1', 'AS_C1', 'AS_S1'],
  servers: ['ERP Server', 'HR Server', 'Monitoring Server', 'IT Server', 'VoIP Server', 'DHCP Server'],
}

function LayerStatCard({ label, live, total, icon: Icon, color, bgColor }: {
  label: string; live: number; total: number; icon: typeof Activity; color: string; bgColor: string
}) {
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border p-2.5', bgColor)}>
      <Icon className={cn('h-4 w-4 shrink-0', color)} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">{live}</span>
          <span className="text-[10px] text-muted-foreground">/ {total}</span>
        </div>
      </div>
      <div className="flex h-6 items-center">
        <span className={cn('inline-block h-2 w-2 rounded-full', live > 0 ? 'bg-green-500 shadow-[0_0_8px] shadow-green-500/50' : 'bg-red-500')} />
      </div>
    </div>
  )
}

export default function TopologyPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)
  const { connected, topology } = useSocket()

  const deviceStatuses = useMemo(() => {
    if (topology?.devices) return topology.devices
    const fallback: Record<string, string> = {}
    Object.values(FALLBACK_DEVICES).flat().forEach((name) => { fallback[name] = 'ONLINE' })
    return fallback
  }, [topology])

  const layerTraffic = useMemo(() => {
    if (topology?.layerTraffic) return topology.layerTraffic
    return { core: 2, distribution: 8, access: 4, servers: 6, totalFlows: 175, activeLinks: 14, totalLinks: 20 }
  }, [topology])

  const getDeviceStatus = (name: string) => deviceStatuses[name] || 'ONLINE'
  const isOnline = (name: string) => getDeviceStatus(name) === 'ONLINE'

  const coreDevices = FALLBACK_DEVICES.core
  const distDevices = FALLBACK_DEVICES.distribution
  const accessDevices = FALLBACK_DEVICES.access
  const serverDevices = FALLBACK_DEVICES.servers

  const onlineCount = Object.values(deviceStatuses).filter((s) => s === 'ONLINE').length
  const totalDevices = Object.values(FALLBACK_DEVICES).flat().length

  const layersData = [
    { key: 'core', label: 'Core Layer', devices: coreDevices, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dotColor: '#3B82F6', icon: Layers },
    { key: 'distribution', label: 'Distribution Layer', devices: distDevices, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dotColor: '#A855F7', icon: Server },
    { key: 'access', label: 'Access Layer', devices: accessDevices, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dotColor: '#10B981', icon: Monitor },
    { key: 'servers', label: 'Servers', devices: serverDevices, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dotColor: '#F59E0B', icon: Server },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Network Topology</h1>
          <p className="text-muted-foreground">Hierarchical enterprise LAN architecture — real-time visualization</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'destructive'} className={cn(connected && 'bg-green-500')}>
            <Radio className={cn('h-3 w-3 mr-1', connected && 'animate-pulse')} />
            {connected ? 'LIVE' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setAutoRotate(!autoRotate)}>
            <RefreshCw className={cn('h-4 w-4 mr-1', autoRotate && 'animate-spin')} />
            Auto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}><ZoomIn className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {/* Topology Map */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4" />
                Live Topology Map
                {connected && <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30"><Zap className="h-3 w-3 mr-1" />Real-time</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-500/50" /> Online ({onlineCount})</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Offline ({totalDevices - onlineCount})</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={containerRef} className="relative h-[520px] overflow-hidden rounded-lg border bg-card network-grid">
              <div
                className="absolute inset-0 transition-transform duration-300"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              >
                {/* SVG connection lines between layers */}
                <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                  {/* Core → Distribution */}
                  <line x1="50%" y1="60" x2="12.5%" y2="160" className="connection-line active" />
                  <line x1="50%" y1="60" x2="37.5%" y2="160" className="connection-line active" />
                  <line x1="50%" y1="60" x2="62.5%" y2="160" className="connection-line active" />
                  <line x1="50%" y1="60" x2="87.5%" y2="160" className="connection-line active" />
                  {/* Distribution → Access */}
                  <line x1="12.5%" y1="250" x2="12.5%" y2="340" className="connection-line active" style={{ stroke: '#A855F7', strokeOpacity: 0.3, strokeDasharray: '4 3' }} />
                  <line x1="37.5%" y1="250" x2="37.5%" y2="340" className="connection-line active" style={{ stroke: '#A855F7', strokeOpacity: 0.3, strokeDasharray: '4 3' }} />
                  <line x1="62.5%" y1="250" x2="62.5%" y2="340" className="connection-line active" style={{ stroke: '#A855F7', strokeOpacity: 0.3, strokeDasharray: '4 3' }} />
                  <line x1="87.5%" y1="250" x2="87.5%" y2="340" className="connection-line active" style={{ stroke: '#A855F7', strokeOpacity: 0.3, strokeDasharray: '4 3' }} />
                  {/* Access → Servers */}
                  <line x1="16%" y1="430" x2="16%" y2="490" className="connection-line active" style={{ stroke: '#10B981', strokeOpacity: 0.2, strokeDasharray: '3 4' }} />
                  <line x1="38%" y1="430" x2="38%" y2="490" className="connection-line active" style={{ stroke: '#10B981', strokeOpacity: 0.2, strokeDasharray: '3 4' }} />
                  <line x1="62%" y1="430" x2="62%" y2="490" className="connection-line active" style={{ stroke: '#10B981', strokeOpacity: 0.2, strokeDasharray: '3 4' }} />
                  <line x1="84%" y1="430" x2="84%" y2="490" className="connection-line active" style={{ stroke: '#10B981', strokeOpacity: 0.2, strokeDasharray: '3 4' }} />
                </svg>

                {/* ===== CORE LAYER ===== */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  <div className="text-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">Core Layer</span>
                  </div>
                  <div className="flex gap-6">
                    {coreDevices.map((name) => (
                      <motion.div
                        key={name}
                        animate={{ scale: isOnline(name) ? 1 : 0.95 }}
                        transition={{ duration: 0.5 }}
                        className={cn('topology-node-core', isOnline(name) && 'online')}
                      >
                        <Network className={cn('h-4 w-4 mx-auto mb-1', isOnline(name) ? 'text-blue-400' : 'text-blue-800')} />
                        <span className="text-xs font-semibold">{name}</span>
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <span className={cn('device-status-dot', isOnline(name) ? 'online' : 'offline')} />
                          <span className="text-[10px] text-muted-foreground">{isOnline(name) ? 'Online' : 'Offline'}</span>
                        </div>
                        {isOnline(name) && <span className="block text-[8px] text-blue-400/60 mt-0.5 animate-pulse">● ● ●</span>}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Connection indicator: Core → Dist */}
                <div className="absolute top-[104px] left-1/2 -translate-x-1/2 w-3/4 flex items-center gap-2" style={{ zIndex: 1 }}>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-1"
                  >
                    <ArrowUpDown className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-blue-400/60">{layerTraffic.totalFlows} flows</span>
                  </motion.div>
                </div>

                {/* ===== DISTRIBUTION LAYER ===== */}
                <div className="absolute top-[120px] left-1/2 -translate-x-1/2 w-full px-8">
                  <div className="text-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-purple-400 font-semibold">Distribution Layer</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {['A', 'B', 'C', 'S'].map((block, bi) => {
                      const blockDevices = distDevices.filter((d) => d.includes(`_${block}`))
                      return (
                        <div key={bi} className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Block {block}</span>
                          {blockDevices.map((name) => (
                            <motion.div
                              key={name}
                              animate={{ scale: isOnline(name) ? 1 : 0.95 }}
                              transition={{ duration: 0.5 }}
                              className={cn('topology-node-distribution', isOnline(name) && 'online')}
                            >
                              <span className="text-xs font-semibold">{name}</span>
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <span className={cn('device-status-dot', isOnline(name) ? 'online' : 'offline')} />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Connection indicator: Dist → Access */}
                <div className="absolute top-[302px] left-1/2 -translate-x-1/2 w-2/3 flex items-center gap-2" style={{ zIndex: 1 }}>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                    className="flex items-center gap-1"
                  >
                    <Wifi className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] text-purple-400/60">{layerTraffic.activeLinks}/{layerTraffic.totalLinks} links</span>
                  </motion.div>
                </div>

                {/* ===== ACCESS LAYER ===== */}
                <div className="absolute top-[320px] left-1/2 -translate-x-1/2">
                  <div className="text-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Access Layer</span>
                  </div>
                  <div className="flex gap-4">
                    {accessDevices.map((name) => (
                      <motion.div
                        key={name}
                        animate={{ scale: isOnline(name) ? 1 : 0.95 }}
                        transition={{ duration: 0.5 }}
                        className={cn('topology-node-access', isOnline(name) && 'online')}
                      >
                        <span className="text-xs font-semibold">{name}</span>
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <span className={cn('device-status-dot', isOnline(name) ? 'online' : 'offline')} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Connection indicator: Access → Servers */}
                <div className="absolute top-[404px] left-1/2 -translate-x-1/2 w-1/2 flex items-center gap-2" style={{ zIndex: 1 }}>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                    className="flex items-center gap-1"
                  >
                    <Gauge className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400/60">{layerTraffic.access} active</span>
                  </motion.div>
                </div>

                {/* ===== SERVERS ===== */}
                <div className="absolute top-[420px] left-1/2 -translate-x-1/2">
                  <div className="text-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">Services</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {serverDevices.map((name) => (
                      <motion.div
                        key={name}
                        animate={{ scale: isOnline(name) ? 1 : 0.95 }}
                        transition={{ duration: 0.5 }}
                        className={cn('topology-node-server', isOnline(name) && 'online')}
                      >
                        <span className="text-[10px] font-semibold">{name}</span>
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <span className={cn('device-status-dot', isOnline(name) ? 'online' : 'offline')} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: Real-time Layer Status */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Layer Status
                {connected && <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 ml-auto">Live</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {layersData.map((layer) => (
                <LayerStatCard
                  key={layer.key}
                  label={layer.label}
                  live={layerTraffic[layer.key as keyof typeof layerTraffic] as number}
                  total={layer.devices.length}
                  icon={layer.icon}
                  color={layer.color}
                  bgColor={layer.bg}
                />
              ))}
              <div className="border-t pt-2 mt-2">
                <LayerStatCard
                  label="Total Network"
                  live={onlineCount}
                  total={totalDevices}
                  icon={Activity}
                  color="text-blue-500"
                  bgColor="bg-blue-500/5"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Network Traffic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Active Flows', value: layerTraffic.totalFlows, icon: Network, color: 'text-purple-500' },
                { label: 'Active Links', value: layerTraffic.activeLinks, icon: Wifi, color: 'text-emerald-500' },
                { label: 'Total Links', value: layerTraffic.totalLinks, icon: ArrowUpDown, color: 'text-blue-500' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', stat.color)} />
                      <span className="text-xs">{stat.label}</span>
                    </div>
                    <span className={cn('text-sm font-bold', stat.color)}>{stat.value}</span>
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>

          {/* Live Events Feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Live Events
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[160px] overflow-y-auto space-y-1.5 scrollbar-thin">
              <div className="text-[10px] text-muted-foreground text-center py-2">
                {connected ? 'Receiving real-time data...' : 'Connect WebSocket server (port 3001) for live events'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
