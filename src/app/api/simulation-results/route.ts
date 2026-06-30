import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toJsonString } from '@/lib/json'

/**
 * API endpoint for Mininet simulation scripts to POST results directly.
 * 
 * Expected JSON body:
 * {
 *   "testType": "ping" | "throughput" | "jitter" | "failover" | "qos" | "vlan" | "scalability",
 *   "architecture": "TRADITIONAL" | "SDN",
 *   "results": [
 *     { "metric": "Average Latency", "value": 18.3, "unit": "ms", "min": 8.4, "max": 32.6, "stdDev": 5.2, "sampleSize": 27 },
 *     { "metric": "Packet Loss", "value": 0.82, "unit": "%", "min": 0.1, "max": 1.5, "stdDev": 0.35, "sampleSize": 27 }
 *   ],
 *   "rawOutput": "optional raw terminal output text",
 *   "scriptName": "failover_testing.py"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { testType, architecture, results, rawOutput, scriptName } = body

    if (!testType || !architecture || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Missing required fields: testType, architecture, results[]' },
        { status: 400 }
      )
    }

    // Find the topology
    const topology = await prisma.topology.findFirst({
      where: { type: architecture.toUpperCase() },
    })

    if (!topology) {
      return NextResponse.json(
        { error: `Topology not found for architecture: ${architecture}` },
        { status: 404 }
      )
    }

    // Create the PerformanceTest record
    const test = await prisma.performanceTest.create({
      data: {
        name: `${scriptName || testType} (${architecture}) - Mininet Live`,
        type: testType,
        topologyId: topology.id,
        duration: body.duration || null,
        config: toJsonString({ source: 'mininet', scriptName, rawOutput: rawOutput?.substring(0, 5000) }),
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    // Create PerformanceResult records
    const resultRecords = results.map((r: any) => ({
      testId: test.id,
      metric: r.metric,
      value: typeof r.value === 'number' ? r.value : parseFloat(r.value) || 0,
      unit: r.unit || '',
      minValue: r.min != null ? r.min : null,
      maxValue: r.max != null ? r.max : null,
      stdDev: r.stdDev != null ? r.stdDev : null,
      sampleSize: r.sampleSize != null ? r.sampleSize : null,
      rawData: r.rawData ? toJsonString(r.rawData) : null,
    }))

    await prisma.performanceResult.createMany({ data: resultRecords })

    // Mark test as completed
    const completed = await prisma.performanceTest.update({
      where: { id: test.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: { results: true, topology: { select: { name: true, type: true } } },
    })

    // Auto-create comparison if opposite architecture test exists
    await autoCreateComparison(test.id, testType, architecture)

    return NextResponse.json({
      success: true,
      testId: test.id,
      resultsCount: resultRecords.length,
      test: completed,
    }, { status: 201 })
  } catch (error) {
    console.error('[Simulation Results API Error]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Return latest simulation results grouped by test type
    const tests = await prisma.performanceTest.findMany({
      where: {
        config: { contains: 'mininet' },
      },
      include: {
        results: true,
        topology: { select: { name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(tests)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function autoCreateComparison(testId: string, testType: string, architecture: string) {
  const oppositeType = architecture.toUpperCase() === 'TRADITIONAL' ? 'SDN' : 'TRADITIONAL'

  const pairedTest = await prisma.performanceTest.findFirst({
    where: {
      type: testType,
      status: 'COMPLETED',
      topology: { type: oppositeType },
      config: { contains: 'mininet' },
      id: { not: testId },
    },
    include: { results: true, topology: { select: { type: true } } },
    orderBy: { completedAt: 'desc' },
  })

  if (!pairedTest) return

  const currentTest = await prisma.performanceTest.findUnique({
    where: { id: testId },
    include: { results: true, topology: { select: { type: true } } },
  })
  if (!currentTest) return

  const tradTest = architecture.toUpperCase() === 'TRADITIONAL' ? currentTest : pairedTest
  const sdnTest = architecture.toUpperCase() === 'SDN' ? currentTest : pairedTest

  // Check if comparison already exists
  const existing = await prisma.comparisonResult.findFirst({
    where: { traditionalTestId: tradTest.id, sdnTestId: sdnTest.id },
  })
  if (existing) return

  const findMetric = (results: any[], name: string) =>
    results.find((r: any) => r.metric.toLowerCase().includes(name.toLowerCase()))

  const calcImprovement = (tradVal: number | undefined, sdnVal: number | undefined, higherIsBetter: boolean): number | null => {
    if (tradVal === undefined || sdnVal === undefined || tradVal === 0) return null
    const raw = ((tradVal - sdnVal) / tradVal) * 100
    return Math.round((higherIsBetter ? raw * -1 : raw) * 10) / 10
  }

  const tradLatency = findMetric(tradTest.results, 'latency')?.value
  const sdnLatency = findMetric(sdnTest.results, 'latency')?.value
  const tradThroughput = findMetric(tradTest.results, 'throughput')?.value
  const sdnThroughput = findMetric(sdnTest.results, 'throughput')?.value
  const tradPacketLoss = findMetric(tradTest.results, 'packet loss')?.value
  const sdnPacketLoss = findMetric(sdnTest.results, 'packet loss')?.value
  const tradRecovery = findMetric(tradTest.results, 'recovery')?.value
  const sdnRecovery = findMetric(sdnTest.results, 'recovery')?.value
  const tradJitter = findMetric(tradTest.results, 'jitter')?.value
  const sdnJitter = findMetric(sdnTest.results, 'jitter')?.value

  await prisma.comparisonResult.create({
    data: {
      traditionalTestId: tradTest.id,
      sdnTestId: sdnTest.id,
      latencyImprovement: calcImprovement(tradLatency, sdnLatency, false),
      throughputImprovement: calcImprovement(tradThroughput, sdnThroughput, true),
      packetLossReduction: calcImprovement(tradPacketLoss, sdnPacketLoss, false),
      recoveryImprovement: calcImprovement(tradRecovery, sdnRecovery, false),
      jitterReduction: calcImprovement(tradJitter, sdnJitter, false),
      summary: `Live Mininet comparison: SDN vs Traditional for ${testType} test.`,
    },
  })
}
