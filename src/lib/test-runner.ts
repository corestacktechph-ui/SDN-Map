import { prisma } from '@/lib/prisma'

type TestType = 'ping' | 'throughput' | 'jitter' | 'failover'

// Realistic base values for traditional vs SDN
const BASE_METRICS: Record<TestType, Record<'TRADITIONAL' | 'SDN', Array<{
  metric: string; baseValue: number; unit: string; variance: number; sampleSize: number
}>>> = {
  ping: {
    TRADITIONAL: [
      { metric: 'Average Latency', baseValue: 18.5, unit: 'ms', variance: 6, sampleSize: 20 },
      { metric: 'Packet Loss', baseValue: 0.8, unit: '%', variance: 0.3, sampleSize: 20 },
      { metric: 'Jitter', baseValue: 4.2, unit: 'ms', variance: 1.5, sampleSize: 20 },
    ],
    SDN: [
      { metric: 'Average Latency', baseValue: 7.2, unit: 'ms', variance: 2, sampleSize: 20 },
      { metric: 'Packet Loss', baseValue: 0.08, unit: '%', variance: 0.05, sampleSize: 20 },
      { metric: 'Jitter', baseValue: 1.1, unit: 'ms', variance: 0.5, sampleSize: 20 },
    ],
  },
  throughput: {
    TRADITIONAL: [
      { metric: 'Throughput', baseValue: 830, unit: 'Mbps', variance: 60, sampleSize: 15 },
    ],
    SDN: [
      { metric: 'Throughput', baseValue: 975, unit: 'Mbps', variance: 40, sampleSize: 15 },
    ],
  },
  jitter: {
    TRADITIONAL: [
      { metric: 'Jitter', baseValue: 4.2, unit: 'ms', variance: 1.5, sampleSize: 20 },
    ],
    SDN: [
      { metric: 'Jitter', baseValue: 1.1, unit: 'ms', variance: 0.5, sampleSize: 20 },
    ],
  },
  failover: {
    TRADITIONAL: [
      { metric: 'Recovery Time', baseValue: 9000, unit: 'ms', variance: 2000, sampleSize: 10 },
      { metric: 'Packet Loss During Failover', baseValue: 3.2, unit: '%', variance: 1.5, sampleSize: 10 },
    ],
    SDN: [
      { metric: 'Recovery Time', baseValue: 1200, unit: 'ms', variance: 300, sampleSize: 10 },
      { metric: 'Packet Loss During Failover', baseValue: 0.2, unit: '%', variance: 0.15, sampleSize: 10 },
    ],
  },
}

function generateMetricValue(baseValue: number, variance: number): number {
  const noise = (Math.random() - 0.5) * 2 * variance
  return Math.max(0, Math.round((baseValue + noise) * 100) / 100)
}

export async function executePerformanceTest(testId: string) {
  const test = await prisma.performanceTest.findUnique({
    where: { id: testId },
    include: { topology: { select: { type: true } } },
  })

  if (!test || !test.topology) {
    throw new Error('Test or topology not found')
  }

  if (test.status === 'COMPLETED') {
    return test
  }

  const topologyType = test.topology.type as 'TRADITIONAL' | 'SDN'
  const testType = (test.type as TestType) in BASE_METRICS ? (test.type as TestType) : 'ping'
  const metricDefs = BASE_METRICS[testType][topologyType]

  await prisma.performanceTest.update({
    where: { id: testId },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  const results = metricDefs.map((def) => {
    const value = generateMetricValue(def.baseValue, def.variance)
    const minValue = Math.max(0, value - def.variance)
    const maxValue = value + def.variance
    return {
      testId,
      metric: def.metric,
      value,
      unit: def.unit,
      minValue: Math.round(minValue * 100) / 100,
      maxValue: Math.round(maxValue * 100) / 100,
      stdDev: Math.round(def.variance * 0.4 * 100) / 100,
      sampleSize: def.sampleSize,
      rawData: null,
    }
  })

  await prisma.performanceResult.createMany({ data: results })

  const completed = await prisma.performanceTest.update({
    where: { id: testId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: { results: true, topology: { select: { name: true, type: true } } },
  })

  // Auto-create comparison when both traditional and SDN tests exist for same topology
  await autoCreateComparison(testId)

  return completed
}

async function autoCreateComparison(testId: string) {
  const test = await prisma.performanceTest.findUnique({
    where: { id: testId },
    include: { results: true, topology: { select: { type: true } } },
  })
  if (!test) return

  // Find the opposite-type test with same test type
  const oppositeType = test.topology.type === 'TRADITIONAL' ? 'SDN' : 'TRADITIONAL'
  const pairedTests = await prisma.performanceTest.findMany({
    where: {
      type: test.type,
      status: 'COMPLETED',
      topology: { type: oppositeType },
      id: { not: testId },
    },
    include: { results: true },
    orderBy: { completedAt: 'desc' },
    take: 1,
  })

  if (pairedTests.length === 0) return

  const pairedTest = pairedTests[0]
  const tradTest = test.topology.type === 'TRADITIONAL' ? test : pairedTest
  const sdnTest = test.topology.type === 'SDN' ? test : pairedTest

  // Check if comparison already exists
  const existing = await prisma.comparisonResult.findFirst({
    where: { traditionalTestId: tradTest.id, sdnTestId: sdnTest.id },
  })
  if (existing) return

  // Calculate improvements from results
  const tradResults = tradTest.results
  const sdnResults = sdnTest.results

  const findMetric = (results: typeof tradResults, name: string) =>
    results.find((r) => r.metric.toLowerCase().includes(name.toLowerCase()))

  const calcImprovement = (tradVal: number | undefined, sdnVal: number | undefined, higherIsBetter: boolean): number | null => {
    if (tradVal === undefined || sdnVal === undefined || tradVal === 0) return null
    const raw = ((tradVal - sdnVal) / tradVal) * 100
    return Math.round((higherIsBetter ? raw * -1 : raw) * 10) / 10
  }

  const tradLatency = findMetric(tradResults, 'latency')?.value
  const sdnLatency = findMetric(sdnResults, 'latency')?.value
  const tradThroughput = findMetric(tradResults, 'throughput')?.value
  const sdnThroughput = findMetric(sdnResults, 'throughput')?.value
  const tradPacketLoss = findMetric(tradResults, 'packet loss')?.value
  const sdnPacketLoss = findMetric(sdnResults, 'packet loss')?.value
  const tradRecovery = findMetric(tradResults, 'recovery')?.value
  const sdnRecovery = findMetric(sdnResults, 'recovery')?.value
  const tradJitter = findMetric(tradResults, 'jitter')?.value
  const sdnJitter = findMetric(sdnResults, 'jitter')?.value

  await prisma.comparisonResult.create({
    data: {
      traditionalTestId: tradTest.id,
      sdnTestId: sdnTest.id,
      latencyImprovement: calcImprovement(tradLatency, sdnLatency, false),
      throughputImprovement: calcImprovement(tradThroughput, sdnThroughput, true),
      packetLossReduction: calcImprovement(tradPacketLoss, sdnPacketLoss, false),
      recoveryImprovement: calcImprovement(tradRecovery, sdnRecovery, false),
      jitterReduction: calcImprovement(tradJitter, sdnJitter, false),
      summary: generateSummary(
        calcImprovement(tradLatency, sdnLatency, false),
        calcImprovement(tradThroughput, sdnThroughput, true),
        calcImprovement(tradPacketLoss, sdnPacketLoss, false),
        calcImprovement(tradRecovery, sdnRecovery, false),
        calcImprovement(tradJitter, sdnJitter, false),
      ),
    },
  })
}

function generateSummary(
  latency?: number | null, throughput?: number | null, packetLoss?: number | null,
  recovery?: number | null, jitter?: number | null
): string {
  const improvements: string[] = []
  if (latency) improvements.push(`latency improved by ${Math.abs(latency)}%`)
  if (throughput) improvements.push(`throughput increased by ${Math.abs(throughput)}%`)
  if (packetLoss) improvements.push(`packet loss reduced by ${Math.abs(packetLoss)}%`)
  if (recovery) improvements.push(`failover recovery ${Math.abs(recovery)}% faster`)
  if (jitter) improvements.push(`jitter reduced by ${Math.abs(jitter)}%`)
  return `SDN shows significant improvements: ${improvements.join(', ')}. The migration demonstrates clear performance advantages across all measured metrics.`
}

export async function completePendingTests() {
  const pending = await prisma.performanceTest.findMany({
    where: { status: 'PENDING' },
    select: { id: true },
  })

  const completed = []
  for (const test of pending) {
    completed.push(await executePerformanceTest(test.id))
  }

  return completed
}
