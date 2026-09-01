'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth'
import { computeWarningStatus, isSameWarnedPerson } from '@/lib/warnings'
import type { Warning, WarningGroup, WarningStatus } from '@/types'
import { revalidatePath } from 'next/cache'

export interface ReservationIdentity {
  name: string
  department: string
  student_id: string
  phone: string
}

// 관리자가 "경고 관리" 화면에서 새 경고 대상자를 검색할 때 쓰는, 기존 예약 내역 기반 검색
// (직접 타이핑 대신 실제 예약 기록에서 선택하도록 해서 오타로 인한 오매칭을 줄임)
export async function searchReservationIdentities(query: string): Promise<ReservationIdentity[]> {
  const session = await getAdminSession()
  if (!session) return []

  const q = query.trim()
  if (!q) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reservations')
    .select('name, department, student_id, phone')
    .or(`name.ilike.%${q}%,student_id.ilike.%${q}%,department.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []

  const seen = new Set<string>()
  const results: ReservationIdentity[] = []
  for (const r of data) {
    const key = `${r.student_id}|${r.name}|${r.phone}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push(r)
    if (results.length >= 10) break
  }
  return results
}

// 경고 누적으로 새로 이용 제한이 발동된 이용자의 예약을 자동 취소.
// - 승인(approved)된 예약은 "앞으로 남은" 것만 취소한다 — 이미 지난 건 실제 이용 기록이므로 건드리지 않음.
// - 승인 대기(pending) 예약은 날짜와 무관하게 전부 취소한다 — 애초에 이용된 적 없는 미확정 신청이라
//   "과거 이용 기록"이 아니고, 제한된 사람의 신청이 관리자 승인 대기 목록에 계속 남아있으면 안 되기 때문.
// 기존 관리자 취소와 동일하게 admin_cancelled 상태 + admin_memo 사유로 남겨서 이용자/관리자 화면에서
// 취소 사유를 확인할 수 있게 함.
async function cancelReservationsForWarning(
  supabase: ReturnType<typeof createAdminClient>,
  identity: { student_id: string; phone: string }
): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0]
  // 동일 인물 판단 기준(학번 또는 전화번호 일치)과 일치시켜, 이 사람 명의의 예약을 빠짐없이 취소
  const identityFilter = `student_id.eq.${identity.student_id},phone.eq.${identity.phone}`
  const patch = {
    status: 'admin_cancelled' as const,
    admin_memo: '경고 누적(2회)으로 인한 이용 제한으로 자동 취소되었습니다.',
    updated_at: new Date().toISOString(),
  }

  const { error: approvedError } = await supabase
    .from('reservations')
    .update(patch)
    .or(identityFilter)
    .eq('status', 'approved')
    .gte('reservation_date', todayStr)

  const { error: pendingError } = await supabase
    .from('reservations')
    .update(patch)
    .or(identityFilter)
    .eq('status', 'pending')

  if (approvedError) console.error('cancelReservationsForWarning(approved) error:', approvedError)
  if (pendingError) console.error('cancelReservationsForWarning(pending) error:', pendingError)
}

export async function addWarning(input: {
  student_id: string
  name: string
  department: string
  phone: string
  reason: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const student_id = input.student_id?.trim()
  const name = input.name?.trim()
  const department = input.department?.trim()
  const phone = input.phone?.trim()
  const reason = input.reason?.trim()

  if (!student_id || !name || !department || !phone) {
    return { success: false, error: '대상자 정보를 모두 입력해 주세요.' }
  }
  if (!reason) {
    return { success: false, error: '경고 사유를 입력해 주세요.' }
  }

  const supabase = createAdminClient()

  // 이번 경고로 이용 제한이 "새로" 발동되는지 판단하기 위해, 등록 전 상태를 먼저 계산해 둠
  // (동일 인물 판단 기준: 학번 또는 전화번호 일치 — 이름/학과는 표기 차이가 있을 수 있어 매칭에서 제외)
  const { data: existing } = await supabase
    .from('warnings')
    .select('created_at')
    .or(`student_id.eq.${student_id},phone.eq.${phone}`)
  const existingDates = (existing ?? []).map((w) => w.created_at as string)
  const beforeStatus = computeWarningStatus(existingDates)

  const { data: inserted, error } = await supabase
    .from('warnings')
    .insert({ student_id, name, department, phone, reason })
    .select('created_at')
    .single()

  if (error || !inserted) {
    console.error('addWarning error:', error)
    return { success: false, error: '경고 등록 중 오류가 발생했습니다.' }
  }

  const afterStatus = computeWarningStatus([...existingDates, inserted.created_at])

  // 이용 제한이 이번 경고로 새로 발동된 경우(=미제한 -> 제한으로 전환)에만 기존 예약을 자동 취소.
  // 이미 제한 중이던 사람은 애초에 신규 예약이 불가능하므로 취소할 미래 예약이 새로 생길 수 없음.
  if (!beforeStatus.restricted && afterStatus.restricted) {
    await cancelReservationsForWarning(supabase, { student_id, phone })
  }

  revalidatePath('/admin')
  revalidatePath('/seminar')
  revalidatePath('/my-reservations')
  return { success: true }
}

export async function deleteWarning(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('warnings').delete().eq('id', id)

  if (error) {
    console.error('deleteWarning error:', error)
    return { success: false, error: '삭제 중 오류가 발생했습니다.' }
  }

  // computeWarningStatus는 매번 raw 기록으로부터 재계산되므로, 삭제 후 목록을 다시 불러오기만 하면
  // 남은 경고 횟수·이용 제한 여부가 자동으로 갱신된 값으로 반영됨
  revalidatePath('/admin')
  return { success: true }
}

// 경고 관리 목록: 동일 인물(학번 또는 전화번호 일치) 단위로 묶어서 경고 횟수·최근 경고일·제한 해제일을 함께 보여줌.
// 학번이 같은 기록끼리, 전화번호가 같은 기록끼리를 각각 묶는 것으로는 부족하다 — A·B가 학번으로,
// B·C가 전화번호로 묶이면 A·B·C가 전부 한 사람이어야 하므로(연쇄 매칭), Union-Find로 묶는다.
export async function getAllWarningGroups(): Promise<WarningGroup[]> {
  const session = await getAdminSession()
  if (!session) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const warnings = data as Warning[]
  const parent = warnings.map((_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  for (let i = 0; i < warnings.length; i++) {
    for (let j = i + 1; j < warnings.length; j++) {
      if (isSameWarnedPerson(warnings[i], warnings[j])) union(i, j)
    }
  }

  const clusters = new Map<number, Warning[]>()
  for (let i = 0; i < warnings.length; i++) {
    const root = find(i)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root)!.push(warnings[i]) // data가 created_at desc이므로 클러스터 내에서도 최신순 유지
  }

  const result: WarningGroup[] = Array.from(clusters.values()).map((members) => {
    const latest = members[0] // 화면 표시용 이름·학과·연락처는 가장 최근 경고 기록 기준
    return {
      student_id: latest.student_id,
      name: latest.name,
      department: latest.department,
      phone: latest.phone,
      warnings: members,
      status: computeWarningStatus(members.map((w) => w.created_at)),
    }
  })

  return result.sort((a, b) => (b.warnings[0]?.created_at ?? '').localeCompare(a.warnings[0]?.created_at ?? ''))
}

// 이용자 본인의 경고 내역 조회 ("내 예약 조회" 화면용). 학번+연락처를 모두 입력하게 하는 건 본인 확인
// (기존 예약 조회 getUserReservations·예약 취소 cancelReservation과 동일한 관례)을 위한 것이고,
// 실제로 어떤 경고가 "내" 경고인지는 동일 인물 판단 기준과 똑같이 학번 OR 전화번호로 조회한다
// (예: 예전에 다른 연락처로 경고를 받았어도 학번이 같으면 여기서도 보여야 함).
export async function getMyWarnings(
  student_id: string,
  phone: string
): Promise<{ warnings: Warning[]; status: WarningStatus }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .or(`student_id.eq.${student_id},phone.eq.${phone}`)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return { warnings: [], status: computeWarningStatus([]) }
  }

  return { warnings: data as Warning[], status: computeWarningStatus(data.map((w) => w.created_at)) }
}

export async function getWarningNoticeText(): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('room_settings')
    .select('warning_notice_text')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) return null
  return data.warning_notice_text
}

export async function updateWarningNoticeText(text: string | null): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { success: false, error: '권한이 없습니다.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('room_settings')
    .update({ warning_notice_text: text?.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { success: false, error: '저장 중 오류가 발생했습니다.' }

  revalidatePath('/admin')
  return { success: true }
}
