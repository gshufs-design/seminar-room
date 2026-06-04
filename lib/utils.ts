import { type ClassValue, clsx } from 'clsx'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addHours, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { ReservationStatus, TimeSlot, Reservation } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string, fmt = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ko })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
}

export function formatTime(time: string): string {
  return time.substring(0, 5)
}

export function getStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    pending: '신청 대기',
    approved: '승인',
    rejected: '거절',
    cancelled: '취소',
    admin_cancelled: '관리자 취소',
  }
  return labels[status]
}

export function getStatusColor(status: ReservationStatus): string {
  const colors: Record<ReservationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-blue-100 text-blue-900 border-blue-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
    admin_cancelled: 'bg-orange-100 text-orange-700 border-orange-300',
  }
  return colors[status]
}

export function getCalendarDotColor(status: ReservationStatus): string {
  if (status === 'pending') return 'bg-yellow-400'
  if (status === 'approved') return 'bg-navy'
  return ''
}

export const OPERATING_HOURS = { start: 7, end: 23 }

export function generateTimeSlots(reservations: Reservation[]): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (let hour = OPERATING_HOURS.start; hour < OPERATING_HOURS.end; hour++) {
    const slotStart = `${String(hour).padStart(2, '0')}:00`
    const slotEnd = `${String(hour + 1).padStart(2, '0')}:00`

    const occupying = reservations.find((r) => {
      if (r.status !== 'pending' && r.status !== 'approved') return false
      const rStart = r.start_time.substring(0, 5)
      const rEnd = r.end_time.substring(0, 5)
      return slotStart >= rStart && slotEnd <= rEnd
    })

    if (occupying) {
      slots.push({
        hour,
        status: occupying.status as 'pending' | 'approved',
        reservationId: occupying.id,
      })
    } else {
      slots.push({ hour, status: 'available' })
    }
  }

  return slots
}

export function canReserveTime(reservationDate: string, startHour: number): boolean {
  const now = new Date()
  // +09:00 명시로 서버(UTC)/클라이언트(KST) 모두 동일하게 KST로 파싱
  const reservationStart = new Date(`${reservationDate}T${String(startHour).padStart(2, '0')}:00:00+09:00`)
  const minAllowedTime = addHours(now, 24)
  return reservationStart >= minAllowedTime
}

export function canShowPassword(reservationDate: string, startTime: string): boolean {
  const now = new Date()
  const reservationStart = new Date(`${reservationDate}T${startTime}+09:00`)
  const showFrom = addHours(reservationStart, -24)
  return now >= showFrom
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  return eachDayOfInterval({ start, end })
}

export function isSlotOccupied(reservations: Reservation[], hour: number): boolean {
  const slotStart = `${String(hour).padStart(2, '0')}:00`
  const slotEnd = `${String(hour + 1).padStart(2, '0')}:00`

  return reservations.some((r) => {
    if (r.status !== 'pending' && r.status !== 'approved') return false
    const rStart = r.start_time.substring(0, 5)
    const rEnd = r.end_time.substring(0, 5)
    return slotStart >= rStart && slotEnd <= rEnd
  })
}

export function padHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
