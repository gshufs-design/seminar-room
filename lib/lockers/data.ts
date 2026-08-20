// =============================================
// 사물함 배치 정적 데이터
// (총학생회에서 알려주신 실제 배치·번호 범위 그대로 반영)
// =============================================

export type ZoneId = 'lobby' | 'reading'

export interface LockerBlock {
  id: string
  label: string
  rangeStart: number
  rangeEnd: number
  cols: number
  /**
   * 있으면: 실제 사물함처럼 "왼쪽 열부터, 열 안에서는 위→아래로 1씩 증가,
   * 열이 끝나면 다음 열"로 번호가 매겨집니다 (열람실 앞 캐비닛).
   * 없으면: 왼쪽→오른쪽, 줄바꿈되면 다음 줄로 내려가는 단순 순차 번호입니다 (로비).
   */
  rows?: number
}

export interface LockerZone {
  id: ZoneId
  label: string
  description: string
  blocks: LockerBlock[]
}

export const LOCKER_ZONES: LockerZone[] = [
  {
    id: 'lobby',
    label: '로비',
    description: '3층 중앙 로비, 정수기 옆 사물함',
    blocks: [
      { id: 'lobby-left', label: '37~48', rangeStart: 37, rangeEnd: 48, cols: 3 },
      { id: 'lobby-right', label: '49~60', rangeStart: 49, rangeEnd: 60, cols: 3 },
    ],
  },
  {
    id: 'reading',
    label: '열람실 앞',
    description: '열람실 입구 사물함',
    blocks: [
      { id: 'reading-d', label: '141~170', rangeStart: 141, rangeEnd: 170, cols: 6, rows: 5 },
      { id: 'reading-g', label: '201~210', rangeStart: 201, rangeEnd: 210, cols: 2, rows: 5 },
      { id: 'reading-e', label: '171~190', rangeStart: 171, rangeEnd: 190, cols: 4, rows: 5 },
      { id: 'reading-f', label: '191~200', rangeStart: 191, rangeEnd: 200, cols: 2, rows: 5 },
      { id: 'reading-c', label: '61~100', rangeStart: 61, rangeEnd: 100, cols: 8, rows: 5 },
      { id: 'reading-b', label: '101~140', rangeStart: 101, rangeEnd: 140, cols: 8, rows: 5 },
    ],
  },
]

export function getZone(zoneId: string): LockerZone | undefined {
  return LOCKER_ZONES.find((z) => z.id === zoneId)
}

export function getBlock(zoneId: string, blockId: string): LockerBlock | undefined {
  return getZone(zoneId)?.blocks.find((b) => b.id === blockId)
}

export function blockTotal(block: LockerBlock): number {
  return block.rangeEnd - block.rangeStart + 1
}

export function zoneTotal(zone: LockerZone): number {
  return zone.blocks.reduce((sum, b) => sum + blockTotal(b), 0)
}

/**
 * 이 블록에 속한 칸들을, 화면에 그릴 순서 그대로(왼쪽→오른쪽, 위→아래) 번호로 반환합니다.
 * 마지막 열이 다 안 채워지는 경우 남는 자리는 null로 채워집니다.
 */
export function blockNumbers(block: LockerBlock): (number | null)[] {
  const total = blockTotal(block)

  if (block.rows) {
    const rows = block.rows
    const cols = Math.ceil(total / rows)
    const arr: (number | null)[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = c * rows + r // 왼쪽 열부터, 열 안에서는 위→아래로 1씩 증가
        arr.push(idx < total ? block.rangeStart + idx : null)
      }
    }
    return arr
  }

  const arr: number[] = []
  for (let n = block.rangeStart; n <= block.rangeEnd; n++) arr.push(n)
  return arr
}

export const TERM_LABELS: Record<string, string> = {
  '1': '한 학기',
  '2': '두 학기',
}

/** 신청 완료 시점에 동의 문구가 따로 설정되어 있지 않으면 이 기본 문구가 스냅샷으로 저장/표시됩니다. */
export const DEFAULT_AGREEMENT_TEXT = `1. 사물함은 신청 시 선택한 이용 기간(한 학기 또는 두 학기) 동안만 사용할 수 있습니다.
2. 이용 마감일이 지나면 안내된 기간 내에 반드시 물품을 회수해야 하며, 회수하지 않은 물품은 임의로 처리될 수 있습니다.
3. 사물함 내 물품 분실·파손에 대해 총학생회는 책임지지 않습니다.
4. 타인에게 사물함을 양도하거나 대여할 수 없습니다.
5. 위 내용을 확인하지 않아 발생하는 불이익은 신청자 본인이 부담합니다.`

/** 저장된 숫자만 있는 연락처를 화면에 보기 좋게 (010-1234-5678) */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return phone
}

// =============================================
// 신청 기간 / 이용 마감일 / 비우는 기간 계산
// (순수 함수 — 클라이언트·서버 어디서 실행해도 결과가 같도록 한국 시간(KST) 기준으로 계산합니다)
// =============================================

/** 오늘 날짜를 한국시간(KST, UTC+9) 기준 'YYYY-MM-DD' 문자열로 */
export function todayISOKst(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD' 문자열에 일수를 더해서 'YYYY-MM-DD'로 */
export function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 두 'YYYY-MM-DD' 사이의 일수 차이 (toISO - fromISO) */
export function diffDaysISO(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00Z').getTime()
  const b = new Date(toISO + 'T00:00:00Z').getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

/** ISO 타임스탬프(예: created_at)를 한국시간(KST) 기준 'YYYY-MM-DD' 날짜로 */
export function toKstDateISO(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/**
 * 해당 연/월의 "첫째 주 금요일" 날짜를 'YYYY-MM-DD'로.
 * 단, 1일이 하필 금요일이면 그 다음 주 금요일(1일 + 7일)을 반환합니다
 * (한 학기를 시작하자마자 그 주에 바로 마감일이 잡히는 걸 피하기 위함).
 */
export function firstFridayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1))
  const dow = d.getUTCDay() // 0=일 ... 5=금 ... 6=토
  const diff = (5 - dow + 7) % 7 // 1일이 금요일이면 0
  d.setUTCDate(d.getUTCDate() + diff + (diff === 0 ? 7 : 0))
  return d.toISOString().slice(0, 10)
}

/**
 * 사물함 이용 마감일은 "매년 3월 첫째 주 금요일"과 "매년 9월 첫째 주 금요일"이
 * 반복되는 구조입니다. fromDateISO(신청일) 기준으로,
 * - term '1'(한 학기): 신청일 이후 가장 가까운(당일 포함) 마감일
 * - term '2'(두 학기): 그 다음 마감일
 * 을 반환합니다. 연도가 바뀌는 경우도 정확히 계산됩니다.
 */
export function computeTermEndDate(term: '1' | '2', fromDateISO: string): string {
  const year = Number(fromDateISO.slice(0, 4))
  const candidates = [
    firstFridayOfMonth(year, 3),
    firstFridayOfMonth(year, 9),
    firstFridayOfMonth(year + 1, 3),
    firstFridayOfMonth(year + 1, 9),
  ]
  const upcoming = candidates.filter((c) => c >= fromDateISO).sort()
  const term1End = upcoming[0] ?? firstFridayOfMonth(year + 1, 3)
  const term2End = upcoming[1] ?? firstFridayOfMonth(year + 1, 9)
  return term === '1' ? term1End : term2End
}

/** 신청 시점(created_at)과 신청 학기를 바탕으로, 그 신청 건의 실제 이용 마감일을 계산합니다. */
export function requestTermEndDate(term: string, createdAt: string): string {
  return computeTermEndDate(term === '2' ? '2' : '1', toKstDateISO(createdAt))
}

/**
 * 승인된 신청 건의 "실제 표시 상태"를 계산합니다.
 * - 마감일 전: 'approved' (사용 중)
 * - 마감일 지나고 비우는 기간 이내: 'clearing' (비우는 중)
 * - 비우는 기간도 지남: 'expired' (다시 빈 자리로 취급)
 * 이미 expired/pending/rejected/cancelled면 그대로 반환합니다.
 * (rawStatus가 'approved'일 때만 날짜 계산이 필요합니다 — 'expired'는 이미 DB에
 *  반영된 사실이라 그대로 통과시킵니다.)
 */
export function computeDisplayStatus(
  rawStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired',
  term: string,
  createdAt: string,
  clearingPeriodDays: number
): 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'clearing' {
  if (rawStatus !== 'approved') return rawStatus
  const endDate = requestTermEndDate(term, createdAt)
  const today = todayISOKst()
  if (today <= endDate) return 'approved'
  const clearEnd = addDaysISO(endDate, clearingPeriodDays)
  if (today <= clearEnd) return 'clearing'
  return 'expired'
}
