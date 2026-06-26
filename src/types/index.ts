export interface TopologyNode {
  id: string
  label: string
  type: 'core' | 'distribution' | 'access' | 'host' | 'server' | 'controller'
  status: 'online' | 'offline' | 'warning'
  ipAddress?: string
  layer?: string
  vlanId?: number
  parentId?: string
  children?: TopologyNode[]
}

export interface TopologyLink {
  id: string
  source: string
  target: string
  status: 'online' | 'offline' | 'warning'
  bandwidth?: number
  latency?: number
  type?: string
}

export interface NetworkStats {
  totalDevices: number
  totalSwitches: number
  totalHosts: number
  totalVlans: number
  controllerStatus: string
  currentLatency: number
  currentThroughput: number
  currentRecoveryTime: number
  currentPacketLoss: number
  healthScore: number
  activeAlerts: number
}

export interface TestConfig {
  type: 'ping' | 'throughput' | 'jitter' | 'failover'
  sourceDevice: string
  targetDevice: string
  duration?: number
  config?: Record<string, unknown>
}

export interface TestResult {
  id: string
  testId: string
  metric: string
  value: number
  unit: string
  minValue?: number
  maxValue?: number
  stdDev?: number
  sampleSize?: number
  rawData?: Record<string, unknown>
  timestamp: string
}

export interface ComparisonData {
  id: string
  traditionalTestId: string
  sdnTestId: string
  latencyImprovement?: number
  throughputImprovement?: number
  packetLossReduction?: number
  recoveryImprovement?: number
  jitterReduction?: number
  summary?: string
}

export interface FlowInfo {
  id: string
  priority: number
  matchCriteria: string
  instructions: string
  byteCount: number
  packetCount: number
  duration?: number
  status: string
  deviceId: string
  deviceName?: string
}

export interface ControllerInfo {
  id: string
  name: string
  type: string
  ipAddress: string
  port: number
  status: string
  version?: string
  uptime?: number
  connectedSwitches: number
  flowCount: number
}

export interface DashboardMetrics {
  cpuUsage: number
  ramUsage: number
  activeHosts: number
  activeSessions: number
  trafficUtilization: number
  linkUtilization: number
  switchCount: number
  controllerStatus: string
}

export interface AlertData {
  id: string
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source?: string
  acknowledged: boolean
  resolved: boolean
  createdAt: string
}

export interface QoSData {
  id: string
  name: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  dscpValue?: number
  queueId?: number
  minRate?: number
  maxRate?: number
  matchCriteria?: string
  enabled: boolean
}

export interface NetworkEventData {
  id: string
  type: string
  message: string
  source?: string
  severity?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ReportData {
  id: string
  title: string
  type: string
  format: string
  fileUrl?: string
  generatedBy?: string
  createdAt: string
}

export interface ChartDataPoint {
  name: string
  traditional: number
  sdn: number
  improvement?: number
}

export interface SimulationStatus {
  isRunning: boolean
  topologyType?: string
  startTime?: string
  activeDevices: number
  controllerConnected: boolean
}
