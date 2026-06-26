import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const switches = await prisma.device.findMany({
      where: {
        type: { in: ['CORE_SWITCH', 'DISTRIBUTION_SWITCH', 'ACCESS_SWITCH'] },
      },
      include: {
        flowEntries: true,
        topology: { select: { name: true, type: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(switches)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
