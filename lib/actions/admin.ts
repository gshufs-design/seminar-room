'use server'

import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { signAdminToken, setAdminCookie, clearAdminCookie, getAdminSession } from '@/lib/auth'
import { getRemainingReservationHours } from '@/lib/reservationHours'
import type { Reservation, ReservationStatus } from '@/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function adminLogin(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !admin) {
    return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  const isValid = await bcrypt.compare(password, admin.password_hash)
  if (!isValid) {
    return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  const token = await signAdminToken({ id: admin.id, username: admin.username })
  setAdminCookie(token)

  return { success: true }
}

export async function adminLogout(): Promise<void> {
  clearAdminCookie()
  redirect('/admin/login')
}

export async function getAllReservations(
  status?: ReservationStatus | 'all',
  search?: string
): Promise<Reservation[]> {
  const session = await getAdminSession()
  if (!session) return []

  const supabase = createAdminClient()
  let query = supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search && search.trim()) {
    query = query.or(
      `name.ilike.%${search}%,student_id.ilike.%${search}%,department.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) {
    console.error('getAllReservations error:', error)
    return []
  }
  return data ?? []
}

export async function updateReservationStatus(
  reservationId: string,
  status: 'approved' | 'rejected',
  admin_memo?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reservations')
    .update({
      status,
      admin_memo: admin_memo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)

  if (error) {
    return { success: false, error: '처리 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

export async function adminCancelReservation(
  reservationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: '취소 사유를 입력해 주세요.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('reservations')
    .update({
      status: 'admin_cancelled',
      admin_memo: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)

  if (error) {
    return { success: false, error: '처리 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

export async function deleteReservation(reservationId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('reservations').delete().eq('id', reservationId)

  if (error) {
    console.error('deleteReservation error:', error)
    return { success: false, error: '삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

export async function updateAdminMemo(
  reservationId: string,
  admin_memo: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('reservations')
    .update({ admin_memo, updated_at: new Date().toISOString() })
    .eq('id', reservationId)

  if (error) return { success: false, error: '메모 저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  return { success: true }
}

export async function getRoomSettings(): Promise<{ room_password: string; notification_email: string | null; notice_text: string | null } | null> {
  const session = await getAdminSession()
  if (!session) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('room_settings')
    .select('room_password, notification_email, notice_text')
    .eq('id', 1)
    .single()

  if (error) return null
  return data
}

export async function getResendConfigured(): Promise<boolean> {
  return !!process.env.RESEND_API_KEY
}

export async function updateNotificationEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: '올바른 이메일 주소를 입력해 주세요.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('room_settings')
    .update({ notification_email: email || null, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { success: false, error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  return { success: true }
}

export async function updateRoomNoticeText(
  text: string | null
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('room_settings')
    .update({ notice_text: text?.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { success: false, error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  revalidatePath('/seminar')
  return { success: true }
}

export async function updateRoomPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  if (!newPassword || newPassword.trim().length === 0) {
    return { success: false, error: '비밀번호를 입력해 주세요.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('room_settings')
    .update({ room_password: newPassword.trim(), updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' }

  return { success: true }
}

export async function getAdminDayReservations(date: string): Promise<Reservation[]> {
  const session = await getAdminSession()
  if (!session) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('reservation_date', date)
    .order('start_time', { ascending: true })

  if (error) return []
  return data ?? []
}

// 관리자가 특정 이용자(예약 상세 등에서)를 확인할 때 "현재 남아있는 예약 시간"을 보여주기 위한 조회.
// 9시간 제한 판정(createReservation)과 동일한 계산 로직(getRemainingReservationHours)을 그대로 재사용.
export async function getUserRemainingHours(student_id: string, name: string, phone: string): Promise<number> {
  const session = await getAdminSession()
  if (!session) return 0

  const supabase = createAdminClient()
  return getRemainingReservationHours(supabase, { student_id, name, phone })
}
