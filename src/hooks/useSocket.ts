'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketMetrics {
  latency: number
  throughput: number
  packetLoss: number
  flows: number
  connections: number
  timestamp: string
}

interface TopologyLink {
  source: string
  target: string
  status: string
  bandwidth: number
}

interface LayerTraffic {
  core: number
  distribution: number
  access: number
  servers: number
  totalFlows: number
  activeLinks: number
  totalLinks: number
}

interface TopologyData {
  devices: Record<string, string>
  links: TopologyLink[]
  layerTraffic: LayerTraffic
  timestamp: string
}

export function useSocket(url?: string) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [metrics, setMetrics] = useState<SocketMetrics | null>(null)
  const [events, setEvents] = useState<Array<{ type: string; message: string; timestamp: string }>>([])
  const [topology, setTopology] = useState<TopologyData | null>(null)

  useEffect(() => {
    const serverUrl = url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })

    socketRef.current.on('connect', () => setConnected(true))
    socketRef.current.on('disconnect', () => setConnected(false))

    socketRef.current.on('metrics', (data: SocketMetrics) => {
      setMetrics(data)
    })

    socketRef.current.on('event', (data: { type: string; message: string }) => {
      setEvents((prev) => [
        { ...data, timestamp: new Date().toISOString() },
        ...prev.slice(0, 49),
      ])
    })

    socketRef.current.on('topology', (data: TopologyData) => {
      setTopology(data)
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [url])

  const emit = (event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }

  return { connected, metrics, events, topology, emit }
}
