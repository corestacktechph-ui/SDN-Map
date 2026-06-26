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
