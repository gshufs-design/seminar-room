'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth'
import { getZone, getBlock, computeDisplayStatus } from '@/lib/lockers/data'
import type { LockerRequest, LockerRequestStatus, LockerStatusEntry, LockerLayoutOverrides, LockerSettings } from '@/types'
import { revalidatePath } from 'next/cache'
import { sendNewLockerRequestNotification } from '@/lib/email'

// 지금 로그인한 사람이 관리자인지 (공개 페이지에서 편집 버튼을 보여줄지 판단용)
export async function isAdminLoggedIn(): Promise<boolean> {
  const session = await getAdminSession()
  return !!session
}

const DEFAULT_LOCKER_SETTINGS: LockerSettings = {
  applications_open: false,
  term1_end_date: null,
  term2_end_date: null,
  clearing_period_days: 7,
  notice_text: null,
  agreement_text: null,
}

// 신청 기간(온오프) · 학기별 이용 마감일 · 비우는 기간 · 학생 페이지 공지 문구 · 이용 안내 동의 문구 —
// 공개적으로 읽을 수 있어야 학생 화면에서 보여줄 수 있습니다 (개인정보 아님).
export async function getLockerSettings(): Promise<LockerSettings> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('locker_settings')
    .select('applications_open, term1_end_date, term2_end_date, clearing_period_days, notice_text, agreement_text')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) return DEFAULT_LOCKER_SETTINGS
  return data as LockerSettings
}

export async function updateLockerSettings(
  patch: Partial<LockerSettings>
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('locker_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    console.error('updateLockerSettings error:', error)
    return { success: false, error: '저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/lockers')
  revalidatePath('/admin/lockers')
  return { success: true }
}

// 도면(지도/로비/열람실 앞)에서 관리자가 옮긴 위치·크기·이름 (요소 id별 덮어쓰기 값만 저장)
export async function getLockerLayoutOverrides(sceneId: string): Promise<LockerLayoutOverrides> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('locker_layouts')
    .select('elements')
    .eq('scene_id', sceneId)
    .maybeSingle()

  if (error || !data) return {}
  return (data.elements as LockerLayoutOverrides) ?? {}
}

export async function saveLockerLayoutOverrides(
  sceneId: string,
  overrides: LockerLayoutOverrides
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('locker_layouts')
    .upsert({ scene_id: sceneId, elements: overrides, updated_at: new Date().toISOString() })

  if (error) {
    console.error('saveLockerLayoutOverrides error:', error)
    return { success: false, error: '저장 중 오류가 발생했습니다.' }
  }

  revalidatePath('/lockers')
  return { success: true }
}

// 마감일 + 비우는 기간이 다 지난 '승인' 건을 실제로 'expired'로 바꿔줍니다.
// (예약 작업/크론 없이도, 누군가 화면을 보거나 신청을 시도하는 시점에 자연스럽게 정리됩니다.
//  이렇게 해야 그 사물함 칸이 진짜로 "다시 신청 가능"해집니다 — 화면 표시만 바꾸는 걸로는
//  DB의 중복신청 방지 트리거가 여전히 그 칸을 막고 있어서 새 신청이 안 들어가거든요.)
async function expireStaleApprovedRequests(): Promise<void> {
  const settings = await getLockerSettings()
  if (!settings.term1_end_date && !settings.term2_end_date) return // 마감일 설정 자체가 없으면 할 일 없음

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('locker_requests').select('id, term').eq('status', 'approved')
  if (error || !data || data.length === 0) return

  const staleIds = data.filter((r) => computeDisplayStatus('approved', r.term, settings) === 'expired').map((r) => r.id)
  if (staleIds.length === 0) return

  await supabase.from('locker_requests').update({ status: 'expired', updated_at: new Date().toISOString() }).in('id', staleIds)
}
// 승인된 칸은 마감일·비우는 기간을 계산해서 'clearing'(비우는 중)으로 바꾸거나,
// 비우는 기간까지 다 지났으면 목록에서 아예 빼서 다시 빈 자리로 취급합니다.
export async function getLockerStatuses(): Promise<LockerStatusEntry[]> {
  await expireStaleApprovedRequests()
  const supabase = createAdminClient()
  const [{ data, error }, settings] = await Promise.all([
    supabase.from('locker_status_public').select('zone_id, block_id, locker_number, status, term'),
    getLockerSettings(),
  ])

  if (error) {
    console.error('getLockerStatuses error:', error)
    return []
  }

  const result: LockerStatusEntry[] = []
  for (const row of data ?? []) {
    const display = computeDisplayStatus(row.status as 'pending' | 'approved', row.term, settings)
    if (display === 'expired') continue // 비우는 기간까지 지남 → 다시 빈 자리로 취급 (목록에서 제외)
    result.push({ zone_id: row.zone_id, block_id: row.block_id, locker_number: row.locker_number, status: display as LockerStatusEntry['status'] })
  }
  return result
}

export interface CreateLockerRequestInput {
  zone_id: string
  block_id: string
  locker_number: number
  department: string
  name: string
  student_id: string
  phone: string
  email: string
  term: '1' | '2'
}

export async function createLockerRequest(
  input: CreateLockerRequestInput
): Promise<{ success: boolean; error?: string }> {
  const { zone_id, block_id, locker_number, department, name, student_id, phone, email, term } = input

  if (!department?.trim() || !name?.trim() || !student_id?.trim() || !phone?.trim() || !email?.trim()) {
    return { success: false, error: '모든 항목을 입력해 주세요.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: '올바른 이메일 주소를 입력해 주세요.' }
  }
  if (term !== '1' && term !== '2') {
    return { success: false, error: '신청 학기를 선택해 주세요.' }
  }

  const settings = await getLockerSettings()
  if (!settings.applications_open) {
    return { success: false, error: '지금은 사물함 신청 기간이 아닙니다.' }
  }

  await expireStaleApprovedRequests() // 마감·비우는 기간이 지난 칸을 먼저 정리해서, 그 자리에 새로 신청할 수 있게 함

  const supabase = createAdminClient()

  // 한 사람당 사물함 1개만 신청할 수 있도록 제한합니다. 이름은 동명이인이 있을 수 있으므로
  // 학번(사번)·연락처·이메일 중 하나라도 기존의 대기중/승인된 신청과 일치하면 중복으로 간주합니다.
  // (관리자가 예외로 등록한 학번은 이 검사를 건너뜁니다 — 학생에게 별도 안내는 하지 않습니다.)
  const trimmedStudentId = student_id.trim()
  const { data: exception } = await supabase
    .from('locker_duplicate_exceptions')
    .select('student_id')
    .eq('student_id', trimmedStudentId)
    .maybeSingle()

  if (!exception) {
    const { data: activeRequests, error: dupError } = await supabase
      .from('locker_requests')
      .select('student_id, phone, email')
      .in('status', ['pending', 'approved'])

    if (dupError) {
      console.error('createLockerRequest duplicate check error:', dupError)
      return { success: false, error: '신청 확인 중 오류가 발생했습니다.' }
    }

    const phoneDigits = phone.trim().replace(/\D/g, '')
    const emailLower = email.trim().toLowerCase()
    const hasDuplicate = (activeRequests ?? []).some(
      (r) =>
        r.student_id === trimmedStudentId ||
        r.phone.replace(/\D/g, '') === phoneDigits ||
        r.email.trim().toLowerCase() === emailLower
    )
    if (hasDuplicate) {
      return { success: false, error: '이미 신청했거나 이용 중인 사물함이 있습니다. 한 명당 사물함 1개만 신청할 수 있습니다.' }
    }
  }

  const zone = getZone(zone_id)
  const block = getBlock(zone_id, block_id)
  if (!zone || !block) {
    return { success: false, error: '존재하지 않는 사물함 구역입니다.' }
  }
  if (locker_number < block.rangeStart || locker_number > block.rangeEnd) {
    return { success: false, error: '존재하지 않는 사물함 번호입니다.' }
  }

  // 이미 신청/예약된 칸인지 먼저 확인 (사용자 친화적 에러 메시지용 — 최종 방지는 DB 트리거가 담당)
  const { data: existing, error: checkError } = await supabase
    .from('locker_requests')
    .select('id')
    .eq('zone_id', zone_id)
    .eq('block_id', block_id)
    .eq('locker_number', locker_number)
    .in('status', ['pending', 'approved'])

  if (checkError) {
    console.error('createLockerRequest check error:', checkError)
    return { success: false, error: '신청 확인 중 오류가 발생했습니다.' }
  }
  if (existing && existing.length > 0) {
    return { success: false, error: '이미 신청되었거나 예약된 사물함입니다. 새로고침 후 다시 확인해 주세요.' }
  }

  const { data, error } = await supabase
    .from('locker_requests')
    .insert({
      zone_id,
      zone_label: zone.label,
      block_id,
      block_label: block.label,
      locker_number,
      department: department.trim(),
      name: name.trim(),
      student_id: student_id.trim(),
      phone: phone.trim().replace(/-/g, ''),
      email: email.trim(),
      term,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('createLockerRequest insert error:', error)
    return { success: false, error: '신청 중 오류가 발생했습니다. 이미 신청된 사물함일 수 있어요.' }
  }

  revalidatePath('/lockers')
  revalidatePath('/admin/lockers')

  // 알림 이메일 발송 (실패해도 신청 자체는 성공으로 처리) — 세미나실과 같은 알림 이메일 설정을 공유합니다.
  const { data: emailSettings, error: settingsError } = await supabase
    .from('room_settings')
    .select('notification_email')
    .eq('id', 1)
    .single()

  if (settingsError) {
    console.error('[email] room_settings 조회 실패:', settingsError.message)
  } else if (emailSettings?.notification_email) {
    const result = await sendNewLockerRequestNotification(data as LockerRequest, emailSettings.notification_email)
    console.log('[email] 사물함 신청 알림 발송 결과:', JSON.stringify(result))
  }

  return { success: true }
}

// ── 신청자 본인 조회/취소 ────────────────────────────────────────

export async function getUserLockerRequests(student_id: string, phone: string): Promise<LockerRequest[]> {
  await expireStaleApprovedRequests()
  const supabase = createAdminClient()

  // 연락처는 학번만으로 먼저 걸러내고, 하이픈 유무에 상관없이 자릿수만 비교합니다.
  // (예전에 하이픈이 포함된 채로 저장된 신청 건도 문제없이 찾을 수 있도록)
  const { data, error } = await supabase
    .from('locker_requests')
    .select('*')
    .eq('student_id', student_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserLockerRequests error:', error)
    return []
  }
  const digitsOnly = phone.replace(/\D/g, '')
  return (data ?? []).filter((r) => r.phone.replace(/\D/g, '') === digitsOnly)
}

export async function cancelLockerRequest(
  requestId: string,
  student_id: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // 본인 확인 (연락처는 하이픈 유무 상관없이 자릿수만 비교)
  const { data: request, error: fetchError } = await supabase
    .from('locker_requests')
    .select('*')
    .eq('id', requestId)
    .eq('student_id', student_id)
    .single()

  if (fetchError || !request || request.phone.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
    return { success: false, error: '신청 내역을 찾을 수 없습니다.' }
  }
  if (request.status === 'cancelled') {
    return { success: false, error: '이미 취소된 신청입니다.' }
  }
  if (request.status === 'rejected') {
    return { success: false, error: '거절된 신청은 취소할 수 없습니다.' }
  }

  const { error } = await supabase
    .from('locker_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) {
    console.error('cancelLockerRequest error:', error)
    return { success: false, error: '취소 처리 중 오류가 발생했습니다.' }
  }

  revalidatePath('/lockers')
  revalidatePath('/my-reservations')
  revalidatePath('/admin/lockers')
  return { success: true }
}

export interface LockerDuplicateException {
  student_id: string
  note: string | null
  created_at: string
}

// 한 사람당 사물함 1개 제한의 예외로 등록된 학번(사번) 목록 (관리자 전용)
export async function getDuplicateExceptions(): Promise<LockerDuplicateException[]> {
  const session = await getAdminSession()
  if (!session) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('locker_duplicate_exceptions')
    .select('student_id, note, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getDuplicateExceptions error:', error)
    return []
  }
  return data ?? []
}

export async function addDuplicateException(
  studentId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }
  if (!studentId?.trim()) return { success: false, error: '학번(사번)을 입력해 주세요.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('locker_duplicate_exceptions')
    .upsert({ student_id: studentId.trim(), note: note?.trim() || null })

  if (error) {
    console.error('addDuplicateException error:', error)
    return { success: false, error: '등록 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/lockers')
  return { success: true }
}

export async function removeDuplicateException(studentId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('locker_duplicate_exceptions').delete().eq('student_id', studentId)

  if (error) {
    console.error('removeDuplicateException error:', error)
    return { success: false, error: '삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/lockers')
  return { success: true }
}

// ── 아래는 관리자 전용 ──────────────────────────────────────────

export async function getAllLockerRequests(status?: LockerRequestStatus | 'all'): Promise<LockerRequest[]> {
  const session = await getAdminSession()
  if (!session) return []

  await expireStaleApprovedRequests()

  const supabase = createAdminClient()
  let query = supabase.from('locker_requests').select('*').order('created_at', { ascending: false })
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    console.error('getAllLockerRequests error:', error)
    return []
  }
  return data ?? []
}

export async function updateLockerRequestStatus(
  requestId: string,
  status: LockerRequestStatus,
  admin_memo?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('locker_requests')
    .update({ status, admin_memo: admin_memo ?? null, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) {
    console.error('updateLockerRequestStatus error:', error)
    return { success: false, error: '처리 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin/lockers')
  revalidatePath('/lockers')
  return { success: true }
}
