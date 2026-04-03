// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FREE_LIMIT } from '@/lib/auth'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, usageCount: true },
  })

  if (!user) redirect('/login')

  return (
    <DashboardClient
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        usageCount: user.usageCount,
        freeLimit: FREE_LIMIT,
      }}
    />
  )
}
