'use server'

import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { signAdminToken, setAdminCookie, clearAdminCookie, getAdminSession } from '@/lib/auth'
import type { Reservation, ReservationStatus, MonthlyStats } from '@/types'
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

export async function getRoomSettings(): Promise<{ room_password: string } | null> {
  const session = await getAdminSession()
  if (!session) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('room_settings')
    .select('room_password')
    .eq('id', 1)
    .single()

  if (error) return null
  return data
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

export async function getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
  const session = await getAdminSession()
  if (!session) {
    return { total: 0, approved: 0, rejected: 0, cancelled: 0, pending: 0, byDepartment: [], byDay: [] }
  }

  const supabase = createAdminClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)

  if (error || !data) {
    return { total: 0, approved: 0, rejected: 0, cancelled: 0, pending: 0, byDepartment: [], byDay: [] }
  }

  const total = data.length
  const approved = data.filter((r) => r.status === 'approved').length
  const rejected = data.filter((r) => r.status === 'rejected').length
  const cancelled = data.filter((r) => r.status === 'cancelled').length
  const pending = data.filter((r) => r.status === 'pending').length

  const deptMap: Record<string, number> = {}
  data.forEach((r) => {
    if (r.status !== 'rejected' && r.status !== 'cancelled') {
      deptMap[r.department] = (deptMap[r.department] ?? 0) + 1
    }
  })
  const byDepartment = Object.entries(deptMap)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)

  const dayMap: Record<string, number> = {}
  data.forEach((r) => {
    if (r.status !== 'rejected' && r.status !== 'cancelled') {
      dayMap[r.reservation_date] = (dayMap[r.reservation_date] ?? 0) + 1
    }
  })
  const byDay = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { total, approved, rejected, cancelled, pending, byDepartment, byDay }
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
