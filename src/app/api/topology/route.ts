import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const topologies = await prisma.topology.findMany({
      include: {
        devices: {
          include: {
            flowEntries: true,
          },
        },
        networkEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(topologies)
  } catch (error) {
    console.error('[Topology API - GET Error]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const topology = await prisma.topology.create({
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        isActive: body.isActive || false,
      },
    })

    return NextResponse.json(topology, { status: 201 })
  } catch (error) {
    console.error('[Topology API - POST Error]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Topology ID required' }, { status: 400 })
    }

    // Use transaction to prevent race condition when activating topology
    const topology = await prisma.$transaction(async (tx) => {
      // Deactivate all topologies first if activating this one
      if (body.isActive) {
        await tx.topology.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        })
      }

      return tx.topology.update({
        where: { id },
        data: {
          name: body.name,
          type: body.type,
          description: body.description,
          isActive: body.isActive,
        },
      })
    })

    return NextResponse.json(topology)
  } catch (error) {
    console.error('[Topology API - PUT Error]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
