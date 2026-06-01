import Header from '@/components/Header'
import MyReservations from '@/components/MyReservations'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '내 예약 조회 | 세미나실 예약',
}

export default function MyReservationsPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">내 예약 조회</h1>
          <p className="text-sm text-gray-500 mt-1">학번과 연락처를 입력하여 예약 내역을 조회할 수 있습니다.</p>
        </div>
        <MyReservations />
      </main>
    </>
  )
}
