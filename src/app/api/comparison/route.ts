import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const comparisons = await prisma.comparisonResult.findMany({
      include: {
        traditionalTest: {
          include: {
            results: true,
            topology: { select: { name: true } },
          },
        },
        sdnTest: {
          include: {
            results: true,
            topology: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(comparisons)
  } catch (error) {
    console.error('[Comparison API - GET Error]:', error)
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

    const comparison = await prisma.comparisonResult.create({
      data: {
        traditionalTestId: body.traditionalTestId,
        sdnTestId: body.sdnTestId,
        latencyImprovement: body.latencyImprovement,
        throughputImprovement: body.throughputImprovement,
        packetLossReduction: body.packetLossReduction,
        recoveryImprovement: body.recoveryImprovement,
        jitterReduction: body.jitterReduction,
        summary: body.summary,
      },
    })

    return NextResponse.json(comparison, { status: 201 })
  } catch (error) {
    console.error('[Comparison API - POST Error]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
