import { getMonthlyStats } from '@/lib/actions/admin'
import StatsView from '@/components/StatsView'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '통계 | 세미나실 예약 관리자',
}

export default async function AdminStatsPage() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const stats = await getMonthlyStats(year, month)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">이용 통계</h1>
        <p className="text-sm text-gray-500 mt-1">월별 세미나실 이용 현황 및 통계를 확인할 수 있습니다.</p>
      </div>
      <StatsView initialStats={stats} initialYear={year} initialMonth={month} />
    </div>
  )
}
