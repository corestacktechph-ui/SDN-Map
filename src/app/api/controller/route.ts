import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const controller = await prisma.controller.findFirst({
      include: {
        devices: {
          where: { status: 'ONLINE' },
        },
      },
    })

    const flowCount = controller
      ? await prisma.flowEntry.count({
          where: { device: { controllerId: controller.id } },
        })
      : 0

    return NextResponse.json({
      controller,
      connectedSwitches: controller?.devices.length || 0,
      totalFlowEntries: flowCount,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const controller = await prisma.controller.upsert({
      where: { id: body.id || 'default' },
      update: {
        name: body.name,
        ipAddress: body.ipAddress,
        port: body.port,
        restApiPort: body.restApiPort,
        status: body.status || 'ONLINE',
        version: body.version || '1.3',
      },
      create: {
        name: body.name || 'Ryu Controller',
        type: 'RYU',
        ipAddress: body.ipAddress || '127.0.0.1',
        port: body.port || 6633,
        restApiPort: body.restApiPort || 8080,
        status: body.status || 'ONLINE',
        version: body.version || '1.3',
      },
    })

    return NextResponse.json(controller)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await prisma.controller.deleteMany()
    return NextResponse.json({ message: 'Controller removed' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
