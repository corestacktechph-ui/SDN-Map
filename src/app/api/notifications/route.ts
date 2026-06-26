import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(notifications)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const notification = await prisma.notification.create({
      data: {
        title: body.title,
        message: body.message,
        type: body.type || 'INFO',
        userId: session.user.id,
      },
    })
    return NextResponse.json(notification, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: body.read },
    })
    return NextResponse.json(notification)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
