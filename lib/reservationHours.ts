import type { createAdminClient } from '@/lib/supabase/server'
import { samePersonOrFilter } from '@/lib/identity'

export const RESERVATION_HOURS_LIMIT = 9

export interface ReservationHoursMatch {
  student_id: string
  phone?: string
}

// 화면에 함께 보여줄 두 기준의 현재 값 ("현재 남아있는 예약"과 "이번 달 이용")
export interface ReservationHoursSummary {
  remaining: number // 지금 아직 끝나지 않은 예약 시간의 합
  monthly: number // 이번 달(1일~말일)에 실제로 쓴/쓸 예약 시간의 합
}

// "지금 이 순간 기준으로 아직 끝나지 않은" pending/approved 예약 시간의 합.
// 월/기간 같은 별도 구간 개념 없이, 호출 시점마다 처음부터 다시 계산한다 — 예약 시간이
// 지나거나 취소되면 그만큼 자동으로 다시 여유가 생기는 구조가 되도록 하기 위함.
// 동일 인물 판단은 lib/identity.ts 기준(학번 또는 전화번호 일치)을 그대로 쓴다 — 경고 시스템의
// 제한 판정과 서로 다른 기준을 쓰면 한쪽만 우회되는 구멍이 생기므로 반드시 통일한다.
export async function getRemainingReservationHours(
  supabase: ReturnType<typeof createAdminClient>,
  match: ReservationHoursMatch
): Promise<number> {
  const { data, error } = await supabase
    .from('reservations')
    .select('reservation_date, start_time, end_time')
    .or(samePersonOrFilter(match))
    .in('status', ['pending', 'approved'])

  if (error || !data) return 0

  const now = new Date()
  return data.reduce((sum, r) => {
    // reservation_date/end_time은 KST 기준 벽시계 값이므로 +09:00 명시해서 파싱 (다른 곳들과 동일한 관례)
    const endDateTime = new Date(`${r.reservation_date}T${r.end_time.substring(0, 8)}+09:00`)
    if (endDateTime <= now) return sum // 이미 종료된 예약은 제외
    return sum + (parseInt(r.end_time) - parseInt(r.start_time))
  }, 0)
}

// "이번 달(1일~말일)"에 속한 pending/approved 예약 시간의 합 — 위 getRemainingReservationHours와
// 달리 이미 지난 것도 전부 포함해서 "그 달에 실제로 쓴/쓸 시간"을 계산한다. 9시간 제한은
// (1) 지금 아직 안 끝난 예약 합계, (2) 이번 달 실제 이용 합계 — 두 기준을 독립적으로 함께 적용한다.
export async function getMonthlyReservationHours(
  supabase: ReturnType<typeof createAdminClient>,
  match: ReservationHoursMatch,
  year: number,
  month: number
): Promise<number> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('reservations')
    .select('start_time, end_time')
    .or(samePersonOrFilter(match))
    .in('status', ['pending', 'approved'])
    .gte('reservation_date', monthStart)
    .lte('reservation_date', monthEnd)

  if (error || !data) return 0
  return data.reduce((sum, r) => sum + (parseInt(r.end_time) - parseInt(r.start_time)), 0)
}
