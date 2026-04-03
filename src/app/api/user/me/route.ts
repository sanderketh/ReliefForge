// src/app/api/user/me/route.ts
import { NextResponse } from 'next/server'
import { getSession, FREE_LIMIT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, usageCount: true, createdAt: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...user,
    freeLimit: FREE_LIMIT,
    remaining: FREE_LIMIT - user.usageCount,
  })
}
