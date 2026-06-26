import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const hosts = await prisma.device.findMany({
      where: {
        type: { in: ['HOST', 'SERVER'] },
      },
      include: {
        topology: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(hosts)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
