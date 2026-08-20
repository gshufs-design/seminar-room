import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminNav from './AdminNav'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '관리자 | 총학생회 예약 시스템',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <AdminNav username={session.username} />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
