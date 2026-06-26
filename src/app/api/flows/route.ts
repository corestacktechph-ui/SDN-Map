import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const flows = await prisma.flowEntry.findMany({
      include: {
        device: {
          select: { name: true, ipAddress: true, dpId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(flows)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const flow = await prisma.flowEntry.create({
      data: {
        priority: body.priority || 100,
        matchCriteria: body.matchCriteria,
        instructions: body.instructions,
        timeoutIdle: body.timeoutIdle,
        timeoutHard: body.timeoutHard,
        deviceId: body.deviceId,
        status: 'INSTALLED',
      },
    })

    return NextResponse.json(flow, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
