import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stats = {
      totalDevices: await prisma.device.count(),
      onlineDevices: await prisma.device.count({ where: { status: 'ONLINE' } }),
      totalSwitches: await prisma.device.count({
        where: {
          type: { in: ['CORE_SWITCH', 'DISTRIBUTION_SWITCH', 'ACCESS_SWITCH'] },
        },
      }),
      totalHosts: await prisma.device.count({
        where: {
          type: { in: ['HOST', 'SERVER'] },
        },
      }),
      totalVlans: await prisma.vlan.count(),
      activeAlerts: await prisma.alert.count({ where: { resolved: false } }),
      recentEvents: await prisma.networkEvent.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      }),
      activeSessions: 0,
      controllerStatus: 'DISCONNECTED',
      latency: '—',
      throughput: '—',
      recoveryTime: '—',
    }

    const controller = await prisma.controller.findFirst()
    if (controller) {
      stats.controllerStatus = controller.status
    }

    // Fetch latest performance metrics from actual Mininet test results
    const latestLatency = await prisma.performanceResult.findFirst({
      where: { metric: { contains: 'Latency' }, value: { gt: 0 } },
      orderBy: { timestamp: 'desc' },
    })
    const latestThroughput = await prisma.performanceResult.findFirst({
      where: { metric: { contains: 'Throughput' }, value: { gt: 0 } },
      orderBy: { timestamp: 'desc' },
    })
    const latestRecovery = await prisma.performanceResult.findFirst({
      where: { metric: { contains: 'Recovery' }, value: { gt: 0 } },
      orderBy: { timestamp: 'desc' },
    })

    if (latestLatency) stats.latency = `${latestLatency.value} ${latestLatency.unit}`
    if (latestThroughput) stats.throughput = `${latestThroughput.value} ${latestThroughput.unit}`
    if (latestRecovery) stats.recoveryTime = `${latestRecovery.value} ${latestRecovery.unit}`

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
