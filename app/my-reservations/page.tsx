'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import MyReservations from '@/components/MyReservations'
import MyLockerRequests from '@/components/MyLockerRequests'
import { CalendarDays, Archive } from 'lucide-react'

type Tab = 'seminar' | 'lockers'

export default function MyReservationsPage() {
  const [tab, setTab] = useState<Tab>('seminar')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'seminar', label: '세미나실 예약', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'lockers', label: '사물함 신청', icon: <Archive className="w-4 h-4" /> },
  ]

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">내 예약 조회</h1>
          <p className="text-sm text-gray-500 mt-1">학번과 연락처를 입력하여 예약·신청 내역을 조회할 수 있습니다.</p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6 max-w-3xl mx-auto">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === id
                  ? 'border-[#003087] text-[#003087]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {tab === 'seminar' ? <MyReservations /> : <MyLockerRequests />}
      </main>
    </>
  )
}
