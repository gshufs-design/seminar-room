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
  '1': '6개월 (한 학기)',
  '2': '1년 (두 학기)',
}

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

export interface LockerPeriodSettings {
  term1_end_date: string | null
  term2_end_date: string | null
  clearing_period_days: number
}

/** 이 학기(term)의 이용 마감일 (관리자가 설정 안 했으면 null = 마감일 없음) */
export function termEndDate(term: string, settings: LockerPeriodSettings): string | null {
  return term === '1' ? settings.term1_end_date : settings.term2_end_date
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
  settings: LockerPeriodSettings
): 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'clearing' {
  if (rawStatus !== 'approved') return rawStatus
  const endDate = termEndDate(term, settings)
  if (!endDate) return 'approved'
  const today = todayISOKst()
  if (today <= endDate) return 'approved'
  const clearEnd = addDaysISO(endDate, settings.clearing_period_days)
  if (today <= clearEnd) return 'clearing'
  return 'expired'
}
