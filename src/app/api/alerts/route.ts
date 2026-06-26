import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
