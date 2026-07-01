import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      include: {
        topology: { select: { name: true, type: true } },
        flowEntries: { take: 5 },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(devices)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/devices
 * Called by Mininet simulation scripts to update device statuses in bulk.
 *
 * Body: {
 *   "architecture": "TRADITIONAL" | "SDN",
 *   "devices": [
 *     { "name": "CS1", "status": "ONLINE" },
 *     { "name": "CS2", "status": "ONLINE" },
 *     ...
 *   ]
 * }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { architecture, devices } = body

    if (!architecture || !Array.isArray(devices) || devices.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: architecture, devices[]' },
        { status: 400 }
      )
    }

    // Find the topology for this architecture
    const topology = await prisma.topology.findFirst({
      where: { type: architecture.toUpperCase() },
    })

    if (!topology) {
      return NextResponse.json(
        { error: `Topology not found for architecture: ${architecture}` },
        { status: 404 }
      )
    }

    // Update each device status
    const updates = await Promise.all(
      devices.map(async (d: { name: string; status: string }) => {
        return prisma.device.updateMany({
          where: { name: d.name, topologyId: topology.id },
          data: { status: d.status.toUpperCase() },
        })
      })
    )

    const totalUpdated = updates.reduce((sum, u) => sum + u.count, 0)

    // Log a network event for this status update
    await prisma.networkEvent.create({
      data: {
        type: 'TOPOLOGY_UPDATE',
        message: `${totalUpdated} devices updated to active status (${architecture} topology)`,
        source: 'mininet',
        severity: 'INFO',
        topologyId: topology.id,
      },
    })

    return NextResponse.json({ success: true, updated: totalUpdated })
  } catch (error) {
    console.error('[Device Status Update Error]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/devices  (called to reset all devices to OFFLINE when simulation stops)
 * Body: { "architecture": "TRADITIONAL" | "SDN", "action": "reset" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { architecture, action } = body

    if (action !== 'reset' || !architecture) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const topology = await prisma.topology.findFirst({
      where: { type: architecture.toUpperCase() },
    })

    if (!topology) {
      return NextResponse.json({ error: 'Topology not found' }, { status: 404 })
    }

    await prisma.device.updateMany({
      where: { topologyId: topology.id },
      data: { status: 'OFFLINE' },
    })

    await prisma.networkEvent.create({
      data: {
        type: 'TOPOLOGY_UPDATE',
        message: `${architecture} simulation stopped — all devices set to OFFLINE`,
        source: 'mininet',
        severity: 'INFO',
        topologyId: topology.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
