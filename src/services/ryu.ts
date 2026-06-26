export interface RyuSwitch {
  dpid: string
  name: string
  ports: Array<{ port_no: number; name: string; state: string }>
}

export interface RyuFlow {
  dpid: string
  table_id: number
  priority: number
  match: Record<string, unknown>
  instructions: Array<{ type: string; actions?: Array<{ type: string; port?: number }> }>
  byte_count: number
  packet_count: number
}

const DEFAULT_RYU_HOST = 'localhost'
const DEFAULT_REST_PORT = 8080

export const ryuService = {
  getHost: () => {
    try {
      const stored = localStorage.getItem('app_settings')
      if (stored) {
        const settings = JSON.parse(stored)
        return { host: settings.ryuHost || DEFAULT_RYU_HOST, port: settings.restApiPort || DEFAULT_REST_PORT }
      }
    } catch {}
    return { host: DEFAULT_RYU_HOST, port: DEFAULT_REST_PORT }
  },

  getBaseUrl: () => {
    const { host, port } = ryuService.getHost()
    return `http://${host}:${port}`
  },

  getSwitches: async (): Promise<RyuSwitch[]> => {
    try {
      const res = await fetch(`${ryuService.getBaseUrl()}/stats/switches`)
      if (!res.ok) return []
      const data = await res.json()
      return data
    } catch {
      return []
    }
  },

  getFlows: async (dpid: string): Promise<RyuFlow[]> => {
    try {
      const res = await fetch(`${ryuService.getBaseUrl()}/stats/flow/${dpid}`)
      if (!res.ok) return []
      const data = await res.json()
      return data[dpid] || []
    } catch {
      return []
    }
  },

  getDesc: async (dpid: string) => {
    try {
      const res = await fetch(`${ryuService.getBaseUrl()}/stats/desc/${dpid}`)
      if (!res.ok) return null
      const data = await res.json()
      return data[dpid] || null
    } catch {
      return null
    }
  },

  getPortStats: async (dpid: string) => {
    try {
      const res = await fetch(`${ryuService.getBaseUrl()}/stats/port/${dpid}`)
      if (!res.ok) return []
      const data = await res.json()
      return data[dpid] || []
    } catch {
      return []
    }
  },

  isReachable: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${ryuService.getBaseUrl()}/stats/switches`, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  },
}
