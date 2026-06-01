'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getDay, getDaysInMonth, startOfMonth, isToday } from 'date-fns'
import type { Reservation } from '@/types'

interface CalendarProps {
  reservations: Reservation[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  currentYear: number
  currentMonth: number
  onMonthChange: (year: number, month: number) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({
  reservations,
  selectedDate,
  onSelectDate,
  currentYear,
  currentMonth,
  onMonthChange,
}: CalendarProps) {
  const firstDay = getDay(startOfMonth(new Date(currentYear, currentMonth - 1)))
  const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth - 1))

  const prevMonth = () => {
    if (currentMonth === 1) onMonthChange(currentYear - 1, 12)
    else onMonthChange(currentYear, currentMonth - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 12) onMonthChange(currentYear + 1, 1)
    else onMonthChange(currentYear, currentMonth + 1)
  }

  const getDateStatus = useCallback(
    (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayRes = reservations.filter((r) => r.reservation_date === dateStr)
      const hasPending = dayRes.some((r) => r.status === 'pending')
      const hasApproved = dayRes.some((r) => r.status === 'approved')
      return { hasPending, hasApproved }
    },
    [reservations, currentYear, currentMonth]
  )

  const today = new Date()

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button
          onClick={prevMonth}
          className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">
          {currentYear}년 {currentMonth}월
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = selectedDate === dateStr
          const isCurrentDay = isToday(new Date(currentYear, currentMonth - 1, day))
          const { hasPending, hasApproved } = getDateStatus(day)
          const weekday = (firstDay + i) % 7

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex flex-col items-center justify-center aspect-square
                text-sm transition-colors
                ${isSelected ? 'bg-[#003087] text-white rounded-lg' : 'hover:bg-gray-50'}
                ${weekday === 0 && !isSelected ? 'text-red-500' : ''}
                ${weekday === 6 && !isSelected ? 'text-blue-600' : ''}
                ${!isSelected && !weekday && !weekday === false ? 'text-gray-800' : ''}
              `}
            >
              <span
                className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                  ${isSelected ? 'bg-[#003087] text-white' : ''}
                  ${isCurrentDay && !isSelected ? 'ring-2 ring-[#003087] text-[#003087]' : ''}
                `}
              >
                {day}
              </span>
              {/* Status dots */}
              <div className="flex gap-0.5 mt-0.5 h-2">
                {hasPending && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-yellow-300' : 'bg-yellow-400'}`} />
                )}
                {hasApproved && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-200' : 'bg-[#003087]'}`} />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <span className="text-xs text-gray-500 font-medium">범례</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="text-xs text-gray-600">신청 대기</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#003087]" />
          <span className="text-xs text-gray-600">승인</span>
        </div>
      </div>
    </div>
  )
}
