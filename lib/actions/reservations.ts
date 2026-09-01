'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { canReserveTime, OPERATING_HOURS } from '@/lib/utils'
import { getWarningStatus } from '@/lib/warnings'
import { getRemainingReservationHours, RESERVATION_HOURS_LIMIT } from '@/lib/reservationHours'
import type { Reservation, ReservationStatus } from '@/types'
import { revalidatePath } from 'next/cache'
import { sendNewReservationNotification } from '@/lib/email'
import { format } from 'date-fns'

// 세미나실 예약 화면의 "이용 안내" 문구 (관리자가 직접 수정, 비어 있으면 기본 문구 사용) — 개인정보 아님, 공개적으로 읽을 수 있어야 함
export async function getRoomNoticeText(): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('room_settings')
    .select('notice_text')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) return null
  return data.notice_text
}

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
  purpose: string
  co_users: { name: string; department: string; student_id: string }[]
}): Promise<{ success: boolean; error?: string; reservation?: Reservation }> {
  const { name, department, student_id, phone, participant_count, reservation_date, start_hour, end_hour, purpose, co_users } = formData

  // 입력 검증
  if (!name || !department || !student_id || !phone || !participant_count) {
    return { success: false, error: '모든 항목을 입력해 주세요.' }
  }
  if (!purpose?.trim()) {
    return { success: false, error: '사용 목적을 입력해 주세요.' }
  }
  if (participant_count < 1 || participant_count > 50) {
    return { success: false, error: '사용 인원은 1~50명 사이여야 합니다.' }
  }

  // 동반 이용자 정보 검증 (2명 이상 시 필수)
  if (participant_count >= 2) {
    const expectedCoUsers = participant_count - 1
    if (!co_users || co_users.length < expectedCoUsers) {
      return { success: false, error: '동반 이용자 정보를 모두 입력해주세요.' }
    }
    for (const cu of co_users) {
      if (!cu.name?.trim() || !cu.department?.trim() || !cu.student_id?.trim()) {
        return { success: false, error: '동반 이용자 정보를 모두 입력해주세요.' }
      }
    }
  }

  // 시간 범위 검증
  const duration = end_hour - start_hour
  if (duration < 1 || duration > 3) {
    return { success: false, error: '예약은 최소 1시간, 최대 3시간까지 가능합니다.' }
  }
  if (start_hour < OPERATING_HOURS.start || end_hour > OPERATING_HOURS.end) {
    return { success: false, error: `운영 시간(${OPERATING_HOURS.start}:00~${OPERATING_HOURS.end}:00) 내에서만 예약 가능합니다.` }
  }

  // 신청일 기준 30일 이내 검증
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]
  if (reservation_date > maxDateStr) {
    return { success: false, error: '신청일 기준 30일 이내의 날짜만 예약 가능합니다.' }
  }

  // 24시간 전 검증
  if (!canReserveTime(reservation_date, start_hour)) {
    return { success: false, error: '예약은 시작 시각 기준 24시간 이전에만 신청할 수 있습니다.' }
  }

  const start_time = `${String(start_hour).padStart(2, '0')}:00:00`
  const end_time = `${String(end_hour).padStart(2, '0')}:00:00`

  const supabase = createAdminClient()

  // 경고 2회 이상 누적 시 마지막 경고일로부터 6개월간 이용 제한 (동일 인물 판단: 학번 또는 전화번호 일치)
  const mainWarningStatus = await getWarningStatus(supabase, { student_id, phone })
  if (mainWarningStatus.restricted && mainWarningStatus.restrictedUntil) {
    const { data: settings } = await supabase
      .from('room_settings')
      .select('warning_notice_text')
      .eq('id', 1)
      .maybeSingle()
    const untilStr = format(new Date(mainWarningStatus.restrictedUntil), 'yyyy-MM-dd')
    const notice = settings?.warning_notice_text ? ` ${settings.warning_notice_text}` : ''
    return {
      success: false,
      error: `경고 누적으로 ${untilStr}까지 세미나실 예약이 제한됩니다.${notice}`,
    }
  }

  // 동반 이용자도 동일하게 이용 제한 여부 확인 (동반 이용자 입력폼엔 연락처가 없으므로 학번만으로 매칭)
  for (const cu of co_users) {
    const cuStatus = await getWarningStatus(supabase, { student_id: cu.student_id })
    if (cuStatus.restricted && cuStatus.restrictedUntil) {
      const untilStr = format(new Date(cuStatus.restrictedUntil), 'yyyy-MM-dd')
      return {
        success: false,
        error: `동반 이용자 '${cu.name}'님은 경고 누적으로 ${untilStr}까지 이용이 제한되어 동반 이용자로 등록할 수 없습니다.`,
      }
    }
  }

  // 1인당 9시간 예약 제한 확인. 동일 인물 판단은 lib/identity.ts 기준(학번 또는 전화번호 일치)을 쓴다 —
  // 경고 시스템의 제한 판정과 동일한 기준이어야 한쪽만 우회되는 구멍이 생기지 않는다.
  // 월/기간 구분 없이, "현재 시각 기준으로 아직 끝나지 않은" pending/approved 예약 시간만 합산한다.
  // 예약이 끝나거나 취소되면 그만큼 자동으로 다시 여유가 생긴다.
  const usedHours = await getRemainingReservationHours(supabase, { student_id, phone })

  if (usedHours + duration > RESERVATION_HOURS_LIMIT) {
    return {
      success: false,
      error: `현재 ${usedHours}시간의 예약이 남아 있습니다. 보유 가능한 예약 시간은 최대 ${RESERVATION_HOURS_LIMIT}시간까지입니다.`,
    }
  }

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
      purpose: purpose.trim(),
      co_users: co_users.length > 0 ? co_users : null,
    })
    .select()
    .single()

  if (error) {
    console.error('createReservation error:', error)
    return { success: false, error: '예약 신청 중 오류가 발생했습니다.' }
  }

  revalidatePath('/')

  // 알림 이메일 발송 (실패해도 예약 자체는 성공으로 처리)
  console.log('[email] 이메일 발송 흐름 시작. 예약 ID:', data.id)

  const { data: settings, error: settingsError } = await supabase
    .from('room_settings')
    .select('notification_email')
    .eq('id', 1)
    .single()

  if (settingsError) {
    console.error('[email] room_settings 조회 실패 (notification_email 컬럼 누락 가능성):', settingsError.message)
  } else {
    console.log('[email] notification_email DB 값:', settings?.notification_email ?? '(없음)')

    if (!settings?.notification_email) {
      console.log('[email] notification_email이 비어 있어 발송 생략. 관리자 페이지 → 알림 이메일 탭에서 설정하세요.')
    } else {
      console.log('[email] sendNewReservationNotification 호출. to:', settings.notification_email)
      const result = await sendNewReservationNotification(data, settings.notification_email)
      console.log('[email] 발송 결과:', JSON.stringify(result))
    }
  }

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

// "내 예약 조회" 화면에 "현재 남아있는 예약 시간: n시간 / 9시간"을 표시하기 위한 조회.
// 9시간 제한 판정(createReservation)과 동일한 계산 로직(getRemainingReservationHours)을 그대로 재사용해서
// 화면에 보여주는 값이 실제 제한 판정 기준과 항상 일치하도록 한다. 이 화면엔 이름 입력란이 없으므로
// 학번+연락처로만 매칭한다.
export async function getMyRemainingHours(student_id: string, phone: string): Promise<number> {
  const supabase = createAdminClient()
  return getRemainingReservationHours(supabase, { student_id, phone })
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
