import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toJsonString } from '@/lib/json'
import { completePendingTests, executePerformanceTest } from '@/lib/test-runner'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const tests = await prisma.performanceTest.findMany({
      where: status ? { status } : undefined,
      include: {
        results: true,
        topology: {
          select: { name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(tests)
  } catch (error) {
    console.error('[Tests API - GET Error]:', error)
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
    const body = await request.json()
    const test = await prisma.performanceTest.create({
      data: {
        name: body.name,
        type: body.type,
        topologyId: body.topologyId,
        sourceDeviceId: body.sourceDeviceId,
        targetDeviceId: body.targetDeviceId,
        duration: body.duration || 10,
        config: toJsonString(body.config ?? {}),
        status: 'PENDING',
      },
    })

    const completed = await executePerformanceTest(test.id)
    return NextResponse.json(completed, { status: 201 })
  } catch (error) {
    console.error('[Tests API - POST Error]:', error)
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json().catch(() => ({}))

    if (body.action === 'complete-pending') {
      const completed = await completePendingTests()
      return NextResponse.json({ completed: completed.length, tests: completed })
    }

    if (!id) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 })
    }

    if (body.action === 'run') {
      const test = await executePerformanceTest(id)
      return NextResponse.json(test)
    }

    const test = await prisma.performanceTest.update({
      where: { id },
      data: {
        status: body.status,
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
      include: {
        results: true,
        topology: { select: { name: true, type: true } },
      },
    })

    return NextResponse.json(test)
  } catch (error) {
    console.error('[Tests API - PUT Error]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
