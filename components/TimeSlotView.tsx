'use client'

import { CheckCircle, Clock, MinusCircle } from 'lucide-react'
import { generateTimeSlots, padHour } from '@/lib/utils'
import type { Reservation, TimeSlot } from '@/types'
import Button from './ui/Button'

interface TimeSlotViewProps {
  date: string
  reservations: Reservation[]
  selectedHours: number[]
  onToggleHour: (hour: number) => void
  onReserveClick: () => void
  isReadOnly?: boolean
  // 관리자 캘린더에서 예약이 찬 슬롯을 클릭했을 때 해당 예약 상세를 보여주기 위한 콜백
  onOccupiedClick?: (reservationId: string) => void
}

export default function TimeSlotView({
  date,
  reservations,
  selectedHours,
  onToggleHour,
  onReserveClick,
  isReadOnly = false,
  onOccupiedClick,
}: TimeSlotViewProps) {
  const slots = generateTimeSlots(reservations)

  const isValidSelection = (hours: number[]): boolean => {
    if (hours.length === 0) return false
    if (hours.length > 3) return false
    const sorted = [...hours].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== 1) return false
    }
    return true
  }

  const handleHourClick = (slot: TimeSlot) => {
    if (slot.status !== 'available') {
      if (isReadOnly && onOccupiedClick && slot.reservationId) {
        onOccupiedClick(slot.reservationId)
      }
      return
    }
    if (isReadOnly) return
    onToggleHour(slot.hour)
  }

  const sortedSelected = [...selectedHours].sort((a, b) => a - b)
  const selectionValid = isValidSelection(sortedSelected)

  const formattedDate = (() => {
    const [y, m, d] = date.split('-')
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`
  })()

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{formattedDate} 시간대별 현황</h3>
        {!isReadOnly && (
          <p className="text-xs text-gray-500 mt-0.5">
            빈 슬롯을 클릭하여 예약 시간을 선택하세요. (최소 1시간, 최대 3시간, 연속된 시간만 선택 가능)
          </p>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {slots.map((slot) => {
          const isSelected = selectedHours.includes(slot.hour)
          const slotLabel = `${padHour(slot.hour)} ~ ${padHour(slot.hour + 1)}`
          const isOccupiedClickable = slot.status !== 'available' && isReadOnly && !!onOccupiedClick && !!slot.reservationId

          return (
            <div
              key={slot.hour}
              onClick={() => handleHourClick(slot)}
              className={`
                flex items-center gap-3 px-5 py-3 transition-colors
                ${slot.status === 'available' && !isReadOnly ? 'cursor-pointer hover:bg-gray-50' : ''}
                ${isOccupiedClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
                ${isSelected ? 'bg-blue-50' : ''}
              `}
            >
              <span className="w-28 text-sm font-mono text-gray-600 flex-shrink-0">{slotLabel}</span>

              <div className="flex-1 h-8 rounded flex items-center px-3 text-sm font-medium">
                {slot.status === 'available' && (
                  <div className={`flex items-center gap-2 w-full rounded px-2 py-1 ${isSelected ? 'bg-[#003087] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {isSelected ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <MinusCircle className="w-4 h-4 flex-shrink-0 text-gray-300" />
                    )}
                    <span>{isSelected ? '선택됨' : '예약 가능'}</span>
                  </div>
                )}
                {slot.status === 'pending' && (
                  <div className="flex items-center gap-2 w-full rounded px-2 py-1 bg-yellow-100 text-yellow-800">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>신청 대기 중</span>
                  </div>
                )}
                {slot.status === 'approved' && (
                  <div className="flex items-center gap-2 w-full rounded px-2 py-1 bg-blue-100 text-[#003087]">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>예약 완료</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!isReadOnly && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              {selectionValid && sortedSelected.length > 0 ? (
                <span className="text-[#003087] font-medium">
                  선택: {padHour(sortedSelected[0])} ~ {padHour(sortedSelected[sortedSelected.length - 1] + 1)}
                  &nbsp;({sortedSelected.length}시간)
                </span>
              ) : selectedHours.length > 0 ? (
                <span className="text-red-500 text-xs">연속된 시간을 1~3시간 선택해 주세요.</span>
              ) : (
                <span className="text-gray-400">시간을 선택해 주세요.</span>
              )}
            </div>
            <Button
              onClick={onReserveClick}
              disabled={!selectionValid}
              size="md"
            >
              예약 신청
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
