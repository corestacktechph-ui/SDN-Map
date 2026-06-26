import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toJsonString } from '@/lib/json'

export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(reports)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const report = await prisma.report.create({
      data: {
        title: body.title,
        type: body.type,
        format: body.format || 'PDF',
        data: toJsonString(body.data),
        fileUrl: body.fileUrl,
        generatedBy: body.generatedBy,
      },
    })
    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
