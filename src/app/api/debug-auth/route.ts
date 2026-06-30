import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

export async function GET() {
  try {
    // Test 1: Can we connect to the database?
    const userCount = await prisma.user.count()
    
    // Test 2: List users (emails only, no passwords)
    const users = await prisma.user.findMany({
      select: { email: true, role: true, name: true }
    })

    // Test 3: Test password verification for admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@amira-capstone.com' }
    })

    let passwordTest = 'USER NOT FOUND'
    if (admin) {
      const isValid = await compare('admin123', admin.password)
      passwordTest = isValid ? 'PASSWORD CORRECT ✓' : 'PASSWORD WRONG ✗ (hash: ' + admin.password.substring(0, 15) + '...)'
    }

    // Test 4: Check env vars
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (' + process.env.NEXTAUTH_SECRET.substring(0, 5) + '...)' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET',
    }

    return NextResponse.json({
      status: 'OK',
      dbConnected: true,
      userCount,
      users,
      passwordTest,
      envCheck,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      dbConnected: false,
    }, { status: 500 })
  }
}
