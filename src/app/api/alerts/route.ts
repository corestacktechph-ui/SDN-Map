import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' 

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(alerts)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/alerts
 * Called by Mininet scripts to create alerts (e.g. link failure, failover events).
 *
 * Body: {
 *   "title": "Link Failure Detected",
 *   "message": "CS1 primary link down — traffic rerouted via CS2",
 *   "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
 *   "source": "mininet"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, message, severity, source } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message' },
        { status: 400 }
      )
    }

    const alert = await prisma.alert.create({
      data: {
        title,
        message,
        severity: (severity || 'INFO').toUpperCase(),
        source: source || 'mininet',
        acknowledged: false,
        resolved: false,
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (body.acknowledged !== undefined) data.acknowledged = body.acknowledged
    if (body.resolved !== undefined) {
      data.resolved = body.resolved
      data.resolvedAt = new Date()
    }

    const alert = await prisma.alert.update({
      where: { id },
      data,
    })
    return NextResponse.json(alert)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
