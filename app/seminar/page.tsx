'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import Calendar from '@/components/Calendar'
import TimeSlotView from '@/components/TimeSlotView'
import ReservationForm from '@/components/ReservationForm'
import { getMonthReservations, getDayReservations, getRoomNoticeText } from '@/lib/actions/reservations'
import { canReserveTime, padHour } from '@/lib/utils'
import type { Reservation } from '@/types'
import { CalendarDays, Info } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayReservations, setDayReservations] = useState<Reservation[]>([])
  const [selectedHours, setSelectedHours] = useState<number[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [loadingMonth, setLoadingMonth] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)
  const [noticeText, setNoticeText] = useState<string | null>(null)

  const loadMonth = useCallback(async (y: number, m: number) => {
    setLoadingMonth(true)
    const data = await getMonthReservations(y, m)
    setMonthReservations(data)
    setLoadingMonth(false)
  }, [])

  useEffect(() => {
    loadMonth(year, month)
  }, [year, month, loadMonth])

  useEffect(() => {
    getRoomNoticeText().then(setNoticeText)
  }, [])

  const handleMonthChange = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
    setSelectedDate(null)
    setSelectedHours([])
    setDayReservations([])
  }

  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date)
    setSelectedHours([])
    setLoadingDay(true)
    const data = await getDayReservations(date)
    setDayReservations(data)
    setLoadingDay(false)
  }, [])

  const handleToggleHour = (hour: number) => {
    setSelectedHours((prev) => {
      if (prev.includes(hour)) {
        return prev.filter((h) => h !== hour)
      }
      // Limit selection to contiguous block
      const next = [...prev, hour].sort((a, b) => a - b)
      if (next.length > 3) return prev
      // Check contiguous
      const isContiguous = next.every((h, i) => i === 0 || h - next[i - 1] === 1)
      if (!isContiguous) return [hour]
      return next
    })
  }

  const handleReserveClick = () => {
    if (!selectedDate || selectedHours.length === 0) return
    const sorted = [...selectedHours].sort((a, b) => a - b)
    const startHour = sorted[0]
    if (!canReserveTime(selectedDate, startHour)) {
      alert('예약은 시작 시각 기준 24시간 이전에만 신청할 수 있습니다.')
      return
    }
    setFormOpen(true)
  }

  const handleFormSuccess = async () => {
    if (selectedDate) {
      const data = await getDayReservations(selectedDate)
      setDayReservations(data)
    }
    await loadMonth(year, month)
    setSelectedHours([])
  }

  const sortedHours = [...selectedHours].sort((a, b) => a - b)
  const startHour = sortedHours[0] ?? 0
  const endHour = (sortedHours[sortedHours.length - 1] ?? 0) + 1

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">세미나실 예약 현황</h1>
          <p className="text-sm text-gray-500 mt-1">날짜를 클릭하면 해당 날짜의 시간대별 현황을 확인할 수 있습니다.</p>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium">이용 안내</p>
            {noticeText ? (
              <p className="whitespace-pre-line">{noticeText}</p>
            ) : (
              <>
                <p>운영 시간: 07:00 ~ 23:00 / 최소 1시간, 최대 3시간 단위로 예약 가능합니다.</p>
                <p>예약은 시작 시각 기준 24시간 이전에만 신청할 수 있습니다.</p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            {loadingMonth ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-80 flex items-center justify-center text-gray-400">
                달력 불러오는 중...
              </div>
            ) : (
              <Calendar
                reservations={monthReservations}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                currentYear={year}
                currentMonth={month}
                onMonthChange={handleMonthChange}
              />
            )}

            {/* Quick links */}
            <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <Link
                href="/my-reservations"
                className="flex items-center gap-2 text-[#003087] hover:underline text-sm font-medium"
              >
                <CalendarDays className="w-4 h-4" />
                내 예약 조회하기
              </Link>
            </div>
          </div>

          {/* Time slots */}
          <div className="lg:col-span-3">
            {selectedDate ? (
              loadingDay ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-80 flex items-center justify-center text-gray-400">
                  불러오는 중...
                </div>
              ) : (
                <TimeSlotView
                  date={selectedDate}
                  reservations={dayReservations}
                  selectedHours={selectedHours}
                  onToggleHour={handleToggleHour}
                  onReserveClick={handleReserveClick}
                />
              )
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-80 flex flex-col items-center justify-center text-gray-400 gap-3">
                <CalendarDays className="w-12 h-12 text-gray-200" />
                <p className="text-sm">왼쪽 달력에서 날짜를 선택해 주세요.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedDate && formOpen && (
        <ReservationForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          date={selectedDate}
          startHour={startHour}
          endHour={endHour}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  )
}
