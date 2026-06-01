'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { canReserveTime, OPERATING_HOURS } from '@/lib/utils'
import type { Reservation, ReservationStatus } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getMonthReservations(year: number, month: number): Promise<Reservation[]> {
  const supabase = createAdminClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDateStr)
    .in('status', ['pending', 'approved'])
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('getMonthReservations error:', error)
    return []
  }
  return data ?? []
}

export async function getDayReservations(date: string): Promise<Reservation[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('reservation_date', date)
    .in('status', ['pending', 'approved'])
    .order('start_time', { ascending: true })

  if (error) {
    console.error('getDayReservations error:', error)
    return []
  }
  return data ?? []
}

export async function createReservation(formData: {
  name: string
  department: string
  student_id: string
  phone: string
  participant_count: number
  reservation_date: string
  start_hour: number
  end_hour: number
}): Promise<{ success: boolean; error?: string; reservation?: Reservation }> {
  const { name, department, student_id, phone, participant_count, reservation_date, start_hour, end_hour } = formData

  // 입력 검증
  if (!name || !department || !student_id || !phone || !participant_count) {
    return { success: false, error: '모든 항목을 입력해 주세요.' }
  }
  if (participant_count < 1 || participant_count > 50) {
    return { success: false, error: '사용 인원은 1~50명 사이여야 합니다.' }
  }

  // 시간 범위 검증
  const duration = end_hour - start_hour
  if (duration < 1 || duration > 3) {
    return { success: false, error: '예약은 최소 1시간, 최대 3시간까지 가능합니다.' }
  }
  if (start_hour < OPERATING_HOURS.start || end_hour > OPERATING_HOURS.end) {
    return { success: false, error: `운영 시간(${OPERATING_HOURS.start}:00~${OPERATING_HOURS.end}:00) 내에서만 예약 가능합니다.` }
  }

  // 24시간 전 검증
  if (!canReserveTime(reservation_date, start_hour)) {
    return { success: false, error: '예약은 시작 시각 기준 24시간 이전에만 신청할 수 있습니다.' }
  }

  const start_time = `${String(start_hour).padStart(2, '0')}:00:00`
  const end_time = `${String(end_hour).padStart(2, '0')}:00:00`

  const supabase = createAdminClient()

  // 중복 예약 확인 (pending / approved 상태 확인)
  const { data: existing, error: checkError } = await supabase
    .from('reservations')
    .select('id, start_time, end_time')
    .eq('reservation_date', reservation_date)
    .in('status', ['pending', 'approved'])

  if (checkError) {
    return { success: false, error: '예약 확인 중 오류가 발생했습니다.' }
  }

  const hasConflict = (existing ?? []).some((r) => {
    const rStart = r.start_time.substring(0, 5)
    const rEnd = r.end_time.substring(0, 5)
    const reqStart = `${String(start_hour).padStart(2, '0')}:00`
    const reqEnd = `${String(end_hour).padStart(2, '0')}:00`
    return reqStart < rEnd && reqEnd > rStart
  })

  if (hasConflict) {
    return { success: false, error: '해당 시간대에 이미 예약이 있습니다. 다른 시간을 선택해 주세요.' }
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      name,
      department,
      student_id,
      phone,
      participant_count,
      reservation_date,
      start_time,
      end_time,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('createReservation error:', error)
    return { success: false, error: '예약 신청 중 오류가 발생했습니다.' }
  }

  revalidatePath('/')
  return { success: true, reservation: data }
}

export async function getUserReservations(student_id: string, phone: string): Promise<Reservation[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('student_id', student_id)
    .eq('phone', phone)
    .order('reservation_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) {
    console.error('getUserReservations error:', error)
    return []
  }
  return data ?? []
}

export async function cancelReservation(
  reservationId: string,
  student_id: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // 본인 확인
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .eq('student_id', student_id)
    .eq('phone', phone)
    .single()

  if (fetchError || !reservation) {
    return { success: false, error: '예약을 찾을 수 없습니다.' }
  }

  if (reservation.status === 'cancelled') {
    return { success: false, error: '이미 취소된 예약입니다.' }
  }
  if (reservation.status === 'rejected') {
    return { success: false, error: '거절된 예약은 취소할 수 없습니다.' }
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', reservationId)

  if (error) {
    return { success: false, error: '취소 처리 중 오류가 발생했습니다.' }
  }

  revalidatePath('/')
  revalidatePath('/my-reservations')
  return { success: true }
}

export async function getRoomPassword(
  reservationId: string,
  student_id: string,
  phone: string
): Promise<{ success: boolean; password?: string; error?: string }> {
  const supabase = createAdminClient()

  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .eq('student_id', student_id)
    .eq('phone', phone)
    .single()

  if (fetchError || !reservation) {
    return { success: false, error: '예약을 찾을 수 없습니다.' }
  }

  if (reservation.status !== 'approved') {
    return { success: false, error: '승인된 예약만 비밀번호를 확인할 수 있습니다.' }
  }

  const now = new Date()
  // start_time은 KST 기준이므로 +09:00 명시 (서버가 UTC여도 KST로 파싱)
  const startTimeStr = reservation.start_time.substring(0, 8)
  const reservationStart = new Date(`${reservation.reservation_date}T${startTimeStr}+09:00`)
  const showFrom = new Date(reservationStart.getTime() - 24 * 60 * 60 * 1000)

  if (now < showFrom) {
    const hoursLeft = Math.ceil((showFrom.getTime() - now.getTime()) / (1000 * 60 * 60))
    return { success: false, error: `비밀번호는 예약 시작 24시간 전(약 ${hoursLeft}시간 후)부터 확인할 수 있습니다.` }
  }

  const { data: settings, error: settingsError } = await supabase
    .from('room_settings')
    .select('room_password')
    .eq('id', 1)
    .single()

  if (settingsError || !settings) {
    return { success: false, error: '비밀번호 조회 중 오류가 발생했습니다.' }
  }

  return { success: true, password: settings.room_password }
}
