'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllReservations, getRoomSettings } from '@/lib/actions/admin'
import { getMonthReservations, getDayReservations } from '@/lib/actions/reservations'
import AdminTable from '@/components/AdminTable'
import Calendar from '@/components/Calendar'
import TimeSlotView from '@/components/TimeSlotView'
import PasswordManager from '@/components/PasswordManager'
import type { Reservation } from '@/types'
import { CalendarDays, List, KeyRound } from 'lucide-react'

type Tab = 'list' | 'calendar' | 'password'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [roomPassword, setRoomPassword] = useState('')

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayReservations, setDayReservations] = useState<Reservation[]>([])

  const loadReservations = useCallback(async () => {
    setLoading(true)
    const data = await getAllReservations()
    setReservations(data)
    setLoading(false)
  }, [])

  const loadSettings = useCallback(async () => {
    const settings = await getRoomSettings()
    if (settings) setRoomPassword(settings.room_password)
  }, [])

  useEffect(() => {
    loadReservations()
    loadSettings()
  }, [loadReservations, loadSettings])

  const loadMonthData = useCallback(async (y: number, m: number) => {
    const data = await getMonthReservations(y, m)
    setMonthReservations(data)
  }, [])

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadMonthData(year, month)
    }
  }, [activeTab, year, month, loadMonthData])

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date)
    const data = await getDayReservations(date)
    setDayReservations(data)
  }

  const pending = reservations.filter((r) => r.status === 'pending').length

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: '예약 목록', icon: <List className="w-4 h-4" /> },
    { id: 'calendar', label: '캘린더', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'password', label: '비밀번호 관리', icon: <KeyRound className="w-4 h-4" /> },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
          {pending > 0 && (
            <p className="text-sm text-yellow-600 font-medium mt-0.5">
              ⚠ 승인 대기 중인 예약이 {pending}건 있습니다.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체', value: reservations.length, color: 'text-gray-700' },
          { label: '신청 대기', value: reservations.filter((r) => r.status === 'pending').length, color: 'text-yellow-600' },
          { label: '승인', value: reservations.filter((r) => r.status === 'approved').length, color: 'text-[#003087]' },
          { label: '거절', value: reservations.filter((r) => r.status === 'rejected').length, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-[#003087] text-[#003087]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : (
          <AdminTable reservations={reservations} onRefresh={loadReservations} />
        )
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <Calendar
              reservations={monthReservations}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              currentYear={year}
              currentMonth={month}
              onMonthChange={(y, m) => {
                setYear(y)
                setMonth(m)
                setSelectedDate(null)
              }}
            />
          </div>
          <div className="lg:col-span-3">
            {selectedDate ? (
              <TimeSlotView
                date={selectedDate}
                reservations={dayReservations}
                selectedHours={[]}
                onToggleHour={() => {}}
                onReserveClick={() => {}}
                isReadOnly
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-64 flex items-center justify-center text-gray-400 text-sm">
                날짜를 선택하면 시간대별 현황이 표시됩니다.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'password' && roomPassword && (
        <PasswordManager currentPassword={roomPassword} />
      )}
    </div>
  )
}
