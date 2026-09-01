import type { createAdminClient } from '@/lib/supabase/server'

export const RESERVATION_HOURS_LIMIT = 9

export interface ReservationHoursMatch {
  student_id: string
  name?: string
  phone?: string
}

// "지금 이 순간 기준으로 아직 끝나지 않은" pending/approved 예약 시간의 합.
// 월/기간 같은 별도 구간 개념 없이, 호출 시점마다 처음부터 다시 계산한다 — 예약 시간이
// 지나거나 취소되면 그만큼 자동으로 다시 여유가 생기는 구조가 되도록 하기 위함.
// 신청자 매칭은 기존 9시간 제한 규칙 그대로 학번·이름·전화번호 중 하나라도 일치하면 동일인으로 본다.
export async function getRemainingReservationHours(
  supabase: ReturnType<typeof createAdminClient>,
  match: ReservationHoursMatch
): Promise<number> {
  const conditions = [`student_id.eq.${match.student_id}`]
  if (match.name) conditions.push(`name.eq.${match.name}`)
  if (match.phone) conditions.push(`phone.eq.${match.phone}`)

  const { data, error } = await supabase
    .from('reservations')
    .select('reservation_date, start_time, end_time')
    .or(conditions.join(','))
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
