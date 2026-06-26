import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const policies = await prisma.qoSPolicy.findMany({
      orderBy: { priority: 'asc' },
    })

    return NextResponse.json(policies)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const policy = await prisma.qoSPolicy.create({
      data: {
        name: body.name,
        description: body.description,
        priority: body.priority,
        dscpValue: body.dscpValue,
        queueId: body.queueId,
        minRate: body.minRate,
        maxRate: body.maxRate,
        matchCriteria: body.matchCriteria,
        enabled: body.enabled ?? true,
      },
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Policy ID required' }, { status: 400 })
    }

    const policy = await prisma.qoSPolicy.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        priority: body.priority,
        dscpValue: body.dscpValue,
        queueId: body.queueId,
        minRate: body.minRate,
        maxRate: body.maxRate,
        matchCriteria: body.matchCriteria,
        enabled: body.enabled,
      },
    })

    return NextResponse.json(policy)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
