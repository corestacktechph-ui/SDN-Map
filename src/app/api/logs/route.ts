import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.log.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const log = await prisma.log.create({
      data: {
        action: body.action,
        entity: body.entity,
        entityId: body.entityId,
        details: body.details,
        userId: body.userId,
        ipAddress: body.ipAddress,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
