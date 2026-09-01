import { addMonths } from 'date-fns'
import type { createAdminClient } from '@/lib/supabase/server'
import { samePersonOrFilter } from '@/lib/identity'
import type { WarningStatus } from '@/types'

const RESTRICTION_THRESHOLD = 2
const RESTRICTION_MONTHS = 6 // 경고 2회 이상(이용 제한 중) 상태에서, 마지막 경고일로부터 이 기간이 지나면 제한 해제 + 경고 횟수 0회로 초기화
const SINGLE_WARNING_RESET_MONTHS = 12 // 경고 1회 상태에서, 그 경고일로부터 이 기간이 지나면 0회로 초기화 (2회 이상이 되는 순간 이 규칙은 더 이상 적용되지 않음)

// 동일 인물 판단 기준은 lib/identity.ts 하나로 통일해서 쓴다 (경고 시스템·9시간 예약 제한 둘 다 동일 기준).
export interface WarningMatch {
  student_id: string
  phone?: string
}

// 경고 횟수는 저장된 raw 경고 기록(created_at 목록)으로부터 매번 처음부터 다시 시뮬레이션해서 계산합니다.
// 별도의 "현재 경고 횟수" 컬럼을 캐싱해두지 않기 때문에, 갱신을 깜빡해서 stale한 값을 참조할 여지가 없습니다.
//
// 규칙:
// - 경고가 1회뿐인 동안: 그 경고일로부터 12개월이 지나면 0회로 초기화.
// - 경고가 2회 이상(이용 제한 발동 중)인 동안: 12개월 규칙은 더 이상 적용되지 않고, 대신 마지막 경고일로부터
//   6개월(=이용 제한이 풀리는 시점)이 지나면 그 시점에 0회로 초기화.
// - 초기화된 뒤 새 경고가 등록되면, 그 경고부터 다시 "1회" 상태로 시작합니다.
// - 초기화(리셋)는 실제로 기록을 지우는 게 아니라 "판단에 사용하는 유효 경고 목록"에서만 걷어내는 것이며,
//   경고 관리 화면에는 raw 기록이 그대로 남아 이력을 확인할 수 있습니다.
export function computeWarningStatus(createdAtDates: string[]): WarningStatus {
  const sorted = [...createdAtDates]
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())

  let active: Date[] = []

  const decayIfDue = (at: Date) => {
    if (active.length === 1) {
      const resetAt = addMonths(active[0], SINGLE_WARNING_RESET_MONTHS)
      if (at >= resetAt) active = []
    } else if (active.length >= RESTRICTION_THRESHOLD) {
      const lastActive = active[active.length - 1]
      const resetAt = addMonths(lastActive, RESTRICTION_MONTHS)
      if (at >= resetAt) active = []
    }
  }

  // 각 경고가 등록되는 시점 기준으로도 그 이전까지의 상태가 이미 초기화 대상이었는지 순서대로 반영
  for (const at of sorted) {
    decayIfDue(at)
    active.push(at)
  }
  // 마지막으로, "지금" 시점 기준으로도 초기화 대상인지 확인 (예: 마지막 경고 이후 추가 경고 없이 시간만 흐른 경우)
  decayIfDue(new Date())

  if (active.length === 0) {
    return { count: 0, lastWarningDate: null, restricted: false, restrictedUntil: null }
  }

  const count = active.length
  const lastWarningDate = active[active.length - 1].toISOString()

  if (count < RESTRICTION_THRESHOLD) {
    return { count, lastWarningDate, restricted: false, restrictedUntil: null }
  }

  const restrictedUntil = addMonths(active[active.length - 1], RESTRICTION_MONTHS)
  // 위 decayIfDue(now) 호출에서 이미 만료 여부를 반영했으므로, 여기까지 count >= 2로 남아있다면 항상 제한 중인 상태
  return { count, lastWarningDate, restricted: true, restrictedUntil: restrictedUntil.toISOString() }
}

export async function getWarningStatus(
  supabase: ReturnType<typeof createAdminClient>,
  match: WarningMatch
): Promise<WarningStatus> {
  const { data, error } = await supabase
    .from('warnings')
    .select('created_at')
    .or(samePersonOrFilter(match))

  if (error || !data) return computeWarningStatus([])
  return computeWarningStatus(data.map((d) => d.created_at as string))
}
