import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toJsonString } from '@/lib/json'

export async function GET() {
  try {
    const results = await prisma.performanceResult.findMany({
      include: {
        test: {
          include: {
            topology: { select: { name: true, type: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await prisma.performanceResult.create({
      data: {
        testId: body.testId,
        metric: body.metric,
        value: body.value,
        unit: body.unit,
        minValue: body.minValue,
        maxValue: body.maxValue,
        stdDev: body.stdDev,
        sampleSize: body.sampleSize,
        rawData: toJsonString(body.rawData),
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
