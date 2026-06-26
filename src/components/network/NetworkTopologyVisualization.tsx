'use client'

import React, { useCallback, useState, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Server, 
  Radio, 
  Monitor, 
  Network as NetworkIcon,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react'

interface NetworkTopologyProps {
  type: 'traditional' | 'sdn'
  liveUpdate?: boolean
}

// Custom Node Component
const DeviceNode = ({ data }: any) => {
  const getIcon = () => {
    switch (data.type) {
      case 'core':
        return <Server className="h-6 w-6 text-blue-500" />
      case 'distribution':
        return <NetworkIcon className="h-6 w-6 text-purple-500" />
      case 'access':
        return <Radio className="h-6 w-6 text-green-500" />
      case 'host':
        return <Monitor className="h-6 w-6 text-gray-500" />
      case 'controller':
        return <Zap className="h-6 w-6 text-yellow-500" />
      default:
        return <Server className="h-6 w-6" />
    }
  }

  const getStatusColor = () => {
    switch (data.status) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="relative">
      <div className={`flex flex-col items-center gap-2 rounded-lg border-2 bg-white p-3 shadow-lg transition-all hover:shadow-xl ${
        data.status === 'online' ? 'border-green-500' : 'border-gray-300'
      }`}>
        <div className="relative">
          {getIcon()}
          <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${getStatusColor()} ring-2 ring-white`} />
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold">{data.label}</div>
          {data.ip && <div className="text-[10px] text-gray-500">{data.ip}</div>}
          {data.metrics && (
            <div className="mt-1 flex gap-1">
              <Badge variant="secondary" className="text-[8px] px-1 py-0">
                {data.metrics.latency}ms
              </Badge>
            </div>
          )}
        </div>
      </div>
      {data.traffic && (
        <div className="absolute -top-2 -right-2">
          <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  device: DeviceNode,
}

export default function NetworkTopologyVisualization({ type, liveUpdate = false }: NetworkTopologyProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [stats, setStats] = useState({
    totalNodes: 0,
    onlineNodes: 0,
    activeLinks: 0,
    avgLatency: 0,
  })

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Generate topology based on type
  const generateTopology = useCallback(() => {
    if (type === 'sdn') {
      // SDN Topology with Controller
      const sdnNodes: Node[] = [
        // Ryu Controller
        {
          id: 'controller',
          type: 'device',
          position: { x: 500, y: 50 },
          data: { 
            label: 'Ryu Controller', 
            type: 'controller',
            status: 'online',
            ip: '127.0.0.1:6633',
            metrics: { latency: 1 }
          },
        },
        // Core Layer
        {
          id: 'cs1',
          type: 'device',
          position: { x: 300, y: 200 },
          data: { 
            label: 'CS1', 
            type: 'core',
            status: 'online',
            ip: '10.0.1.1',
            metrics: { latency: 5 },
            traffic: true
          },
        },
        {
          id: 'cs2',
          type: 'device',
          position: { x: 700, y: 200 },
          data: { 
            label: 'CS2', 
            type: 'core',
            status: 'online',
            ip: '10.0.1.2',
            metrics: { latency: 5 },
            traffic: true
          },
        },
        // Distribution Layer
        {
          id: 'ds_a1',
          type: 'device',
          position: { x: 150, y: 350 },
          data: { label: 'DS_A1', type: 'distribution', status: 'online', metrics: { latency: 8 } },
        },
        {
          id: 'ds_b1',
          type: 'device',
          position: { x: 400, y: 350 },
          data: { label: 'DS_B1', type: 'distribution', status: 'online', metrics: { latency: 8 } },
        },
        {
          id: 'ds_s1',
          type: 'device',
          position: { x: 650, y: 350 },
          data: { label: 'DS_S1', type: 'distribution', status: 'online', metrics: { latency: 9 } },
        },
        {
          id: 'ds_s2',
          type: 'device',
          position: { x: 850, y: 350 },
          data: { label: 'DS_S2', type: 'distribution', status: 'online', metrics: { latency: 9 } },
        },
        // Access Layer
        {
          id: 'as_a1',
          type: 'device',
          position: { x: 150, y: 500 },
          data: { label: 'AS_A1', type: 'access', status: 'online', metrics: { latency: 12 } },
        },
        {
          id: 'as_b1',
          type: 'device',
          position: { x: 400, y: 500 },
          data: { label: 'AS_B1', type: 'access', status: 'online', metrics: { latency: 12 } },
        },
        {
          id: 'as_s1',
          type: 'device',
          position: { x: 750, y: 500 },
          data: { label: 'AS_S1', type: 'access', status: 'online', metrics: { latency: 13 } },
        },
        // Hosts (sample)
        {
          id: 'h1',
          type: 'device',
          position: { x: 100, y: 650 },
          data: { label: 'Host 1', type: 'host', status: 'online', ip: '10.1.0.51' },
        },
        {
          id: 'h2',
          type: 'device',
          position: { x: 200, y: 650 },
          data: { label: 'Host 2', type: 'host', status: 'online', ip: '10.1.0.52' },
        },
        {
          id: 'h10',
          type: 'device',
          position: { x: 350, y: 650 },
          data: { label: 'Host 10', type: 'host', status: 'online', ip: '10.1.4.51' },
        },
        {
          id: 'erp',
          type: 'device',
          position: { x: 700, y: 650 },
          data: { label: 'ERP Server', type: 'host', status: 'online', ip: '10.1.91.10' },
        },
        {
          id: 'dhcp',
          type: 'device',
          position: { x: 800, y: 650 },
          data: { label: 'DHCP Server', type: 'host', status: 'online', ip: '10.1.94.20' },
        },
      ]

      const sdnEdges: Edge[] = [
        // Controller connections (OpenFlow)
        { id: 'e-ctrl-cs1', source: 'controller', target: 'cs1', type: 'straight', animated: true, style: { stroke: '#FFD700', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-ctrl-cs2', source: 'controller', target: 'cs2', type: 'straight', animated: true, style: { stroke: '#FFD700', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-ctrl-ds1', source: 'controller', target: 'ds_a1', type: 'straight', animated: true, style: { stroke: '#FFD700', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-ctrl-ds2', source: 'controller', target: 'ds_b1', type: 'straight', animated: true, style: { stroke: '#FFD700', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-ctrl-ds3', source: 'controller', target: 'ds_s1', type: 'straight', animated: true, style: { stroke: '#FFD700', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-ctrl-ds4', source: 'controller', target: 'ds_s2', type: 'straight', animated: true, style: { stroke: '#FFD700', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        
        // Core inter-connect
        { id: 'e-cs1-cs2', source: 'cs1', target: 'cs2', animated: true, style: { stroke: '#3B82F6', strokeWidth: 3 } },
        
        // Core to Distribution
        { id: 'e-cs1-ds1', source: 'cs1', target: 'ds_a1', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        { id: 'e-cs1-ds2', source: 'cs1', target: 'ds_b1', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        { id: 'e-cs2-ds3', source: 'cs2', target: 'ds_s1', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        { id: 'e-cs2-ds4', source: 'cs2', target: 'ds_s2', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        
        // Distribution to Access
        { id: 'e-ds1-as1', source: 'ds_a1', target: 'as_a1', style: { stroke: '#10B981', strokeWidth: 2 } },
        { id: 'e-ds2-as2', source: 'ds_b1', target: 'as_b1', style: { stroke: '#10B981', strokeWidth: 2 } },
        { id: 'e-ds3-as3', source: 'ds_s1', target: 'as_s1', style: { stroke: '#10B981', strokeWidth: 2 } },
        { id: 'e-ds4-as3', source: 'ds_s2', target: 'as_s1', style: { stroke: '#10B981', strokeWidth: 2 } },
        
        // Access to Hosts
        { id: 'e-as1-h1', source: 'as_a1', target: 'h1', style: { strokeWidth: 1 } },
        { id: 'e-as1-h2', source: 'as_a1', target: 'h2', style: { strokeWidth: 1 } },
        { id: 'e-as2-h10', source: 'as_b1', target: 'h10', style: { strokeWidth: 1 } },
        { id: 'e-as3-erp', source: 'as_s1', target: 'erp', style: { strokeWidth: 1 } },
        { id: 'e-as3-dhcp', source: 'as_s1', target: 'dhcp', style: { strokeWidth: 1 } },
      ]

      setNodes(sdnNodes)
      setEdges(sdnEdges)
      setStats({
        totalNodes: sdnNodes.length,
        onlineNodes: sdnNodes.filter(n => n.data.status === 'online').length,
        activeLinks: sdnEdges.length,
        avgLatency: 8.5,
      })
    } else {
      // Traditional Topology (similar structure, no controller)
      const tradNodes: Node[] = [
        // Core Layer
        {
          id: 'cs1',
          type: 'device',
          position: { x: 300, y: 150 },
          data: { 
            label: 'CS1 (VRRP Master)', 
            type: 'core',
            status: 'online',
            ip: '10.0.1.1',
            metrics: { latency: 12 },
            traffic: true
          },
        },
        {
          id: 'cs2',
          type: 'device',
          position: { x: 700, y: 150 },
          data: { 
            label: 'CS2 (VRRP Backup)', 
            type: 'core',
            status: 'online',
            ip: '10.0.1.2',
            metrics: { latency: 12 }
          },
        },
        // Distribution Layer
        {
          id: 'ds_a1',
          type: 'device',
          position: { x: 150, y: 300 },
          data: { label: 'DS_A1', type: 'distribution', status: 'online', metrics: { latency: 18 } },
        },
        {
          id: 'ds_b1',
          type: 'device',
          position: { x: 400, y: 300 },
          data: { label: 'DS_B1', type: 'distribution', status: 'online', metrics: { latency: 18 } },
        },
        {
          id: 'ds_s1',
          type: 'device',
          position: { x: 650, y: 300 },
          data: { label: 'DS_S1', type: 'distribution', status: 'online', metrics: { latency: 19 } },
        },
        {
          id: 'ds_s2',
          type: 'device',
          position: { x: 850, y: 300 },
          data: { label: 'DS_S2', type: 'distribution', status: 'online', metrics: { latency: 19 } },
        },
        // Access Layer
        {
          id: 'as_a1',
          type: 'device',
          position: { x: 150, y: 450 },
          data: { label: 'AS_A1', type: 'access', status: 'online', metrics: { latency: 25 } },
        },
        {
          id: 'as_b1',
          type: 'device',
          position: { x: 400, y: 450 },
          data: { label: 'AS_B1', type: 'access', status: 'online', metrics: { latency: 25 } },
        },
        {
          id: 'as_s1',
          type: 'device',
          position: { x: 750, y: 450 },
          data: { label: 'AS_S1', type: 'access', status: 'online', metrics: { latency: 26 } },
        },
        // Hosts (sample)
        {
          id: 'h1',
          type: 'device',
          position: { x: 100, y: 600 },
          data: { label: 'Host 1', type: 'host', status: 'online', ip: '10.1.0.51' },
        },
        {
          id: 'h2',
          type: 'device',
          position: { x: 200, y: 600 },
          data: { label: 'Host 2', type: 'host', status: 'online', ip: '10.1.0.52' },
        },
        {
          id: 'h10',
          type: 'device',
          position: { x: 350, y: 600 },
          data: { label: 'Host 10', type: 'host', status: 'online', ip: '10.1.4.51' },
        },
        {
          id: 'erp',
          type: 'device',
          position: { x: 700, y: 600 },
          data: { label: 'ERP Server', type: 'host', status: 'online', ip: '10.1.91.10' },
        },
        {
          id: 'dhcp',
          type: 'device',
          position: { x: 800, y: 600 },
          data: { label: 'DHCP Server', type: 'host', status: 'online', ip: '10.1.94.20' },
        },
      ]

      const tradEdges: Edge[] = [
        // Core inter-connect (VRRP)
        { id: 'e-cs1-cs2', source: 'cs1', target: 'cs2', animated: false, style: { stroke: '#EF4444', strokeWidth: 3, strokeDasharray: '5,5' }, label: 'VRRP' },
        
        // Core to Distribution (Redundant paths)
        { id: 'e-cs1-ds1', source: 'cs1', target: 'ds_a1', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        { id: 'e-cs1-ds2', source: 'cs1', target: 'ds_b1', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        { id: 'e-cs2-ds3', source: 'cs2', target: 'ds_s1', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        { id: 'e-cs2-ds4', source: 'cs2', target: 'ds_s2', style: { stroke: '#8B5CF6', strokeWidth: 2 } },
        
        // Distribution to Access
        { id: 'e-ds1-as1', source: 'ds_a1', target: 'as_a1', style: { stroke: '#10B981', strokeWidth: 2 } },
        { id: 'e-ds2-as2', source: 'ds_b1', target: 'as_b1', style: { stroke: '#10B981', strokeWidth: 2 } },
        { id: 'e-ds3-as3', source: 'ds_s1', target: 'as_s1', style: { stroke: '#10B981', strokeWidth: 2 } },
        { id: 'e-ds4-as3', source: 'ds_s2', target: 'as_s1', style: { stroke: '#10B981', strokeWidth: 2 } },
        
        // Access to Hosts
        { id: 'e-as1-h1', source: 'as_a1', target: 'h1', style: { strokeWidth: 1 } },
        { id: 'e-as1-h2', source: 'as_a1', target: 'h2', style: { strokeWidth: 1 } },
        { id: 'e-as2-h10', source: 'as_b1', target: 'h10', style: { strokeWidth: 1 } },
        { id: 'e-as3-erp', source: 'as_s1', target: 'erp', style: { strokeWidth: 1 } },
        { id: 'e-as3-dhcp', source: 'as_s1', target: 'dhcp', style: { strokeWidth: 1 } },
      ]

      setNodes(tradNodes)
      setEdges(tradEdges)
      setStats({
        totalNodes: tradNodes.length,
        onlineNodes: tradNodes.filter(n => n.data.status === 'online').length,
        activeLinks: tradEdges.length,
        avgLatency: 18.5,
      })
    }
  }, [type])

  useEffect(() => {
    generateTopology()
  }, [generateTopology])

  // Simulate live updates
  useEffect(() => {
    if (!liveUpdate) return

    const interval = setInterval(() => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.data.metrics) {
            return {
              ...node,
              data: {
                ...node.data,
                metrics: {
                  ...node.data.metrics,
                  latency: Math.max(1, node.data.metrics.latency + (Math.random() - 0.5) * 2),
                },
                traffic: Math.random() > 0.5,
              },
            }
          }
          return node
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [liveUpdate, setNodes])

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NetworkIcon className="h-5 w-5" />
              {type === 'sdn' ? 'SDN Network Topology' : 'Traditional Network Topology'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive network visualization - Click and drag nodes to rearrange
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateTopology}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <Server className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Nodes</p>
              <p className="text-lg font-bold">{stats.totalNodes}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <Activity className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="text-lg font-bold text-green-500">{stats.onlineNodes}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <NetworkIcon className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Active Links</p>
              <p className="text-lg font-bold">{stats.activeLinks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <Zap className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="text-lg font-bold">{stats.avgLatency.toFixed(1)}ms</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            <span className="text-xs">Core</span>
          </div>
          <div className="flex items-center gap-2">
            <NetworkIcon className="h-4 w-4 text-purple-500" />
            <span className="text-xs">Distribution</span>
          </div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-500" />
            <span className="text-xs">Access</span>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-gray-500" />
            <span className="text-xs">Host/Server</span>
          </div>
          {type === 'sdn' && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs">SDN Controller</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-8 bg-gradient-to-r from-green-500 to-red-500 rounded" />
            <span className="text-xs">Link Quality</span>
          </div>
        </div>

        {/* Network Graph */}
        <div style={{ height: 700 }} className="rounded-lg border bg-gray-50 dark:bg-gray-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Tips */}
        <div className="mt-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950 text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Interaction Tips:</p>
          <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs ml-4">
            <li>• Drag nodes to rearrange the topology</li>
            <li>• Scroll to zoom in/out</li>
            <li>• Click nodes to see details</li>
            {type === 'sdn' && <li>• Yellow animated lines show OpenFlow control connections</li>}
            {liveUpdate && <li>• Metrics update every 2 seconds (live mode)</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
