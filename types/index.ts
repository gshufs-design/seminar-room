export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'admin_cancelled'

export interface CoUser {
  name: string
  department: string
  student_id: string
}

export interface Reservation {
  id: string
  reservation_number: number
  name: string
  department: string
  student_id: string
  phone: string
  participant_count: number
  reservation_date: string
  start_time: string
  end_time: string
  status: ReservationStatus
  admin_memo: string | null
  purpose: string
  co_users: CoUser[] | null
  created_at: string
  updated_at: string
}

export interface Admin {
  id: string
  username: string
  created_at: string
}

export interface RoomSettings {
  id: number
  room_password: string
  notification_email: string | null
  notice_text: string | null
  updated_at: string
}

export interface TimeSlot {
  hour: number
  status: 'available' | 'pending' | 'approved'
  reservationId?: string
}

export interface CalendarDay {
  date: string
  hasAvailable: boolean
  hasPending: boolean
  hasApproved: boolean
}

export interface ReservationFormData {
  name: string
  department: string
  student_id: string
  phone: string
  participant_count: number
  reservation_date: string
  start_hour: number
  end_hour: number
}

export interface MonthlyStats {
  total: number
  approved: number
  rejected: number
  cancelled: number
  pending: number
  byDepartment: { department: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export interface AdminSession {
  id: string
  username: string
}

// =============================================
// 사물함 예약 (Lockers)
// =============================================
export type LockerRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'

export interface LockerRequest {
  id: string
  zone_id: string
  zone_label: string
  block_id: string
  block_label: string
  locker_number: number
  department: string
  name: string
  student_id: string
  phone: string
  email: string
  term: '1' | '2'
  status: LockerRequestStatus
  admin_memo: string | null
  created_at: string
  updated_at: string
}

// 공개 화면에서 쓰는, 개인정보가 빠진 최소 정보 (어떤 칸이 비었는지만)
export interface LockerStatusEntry {
  zone_id: string
  block_id: string
  locker_number: number
  // 'clearing'은 이용 마감일이 지나서 "비우는 중" 기간에 있는 칸 (DB에는 없는, 계산된 상태)
  status: LockerRequestStatus | 'clearing'
}

// 관리자가 설정하는 사물함 신청/이용 기간
export interface LockerSettings {
  applications_open: boolean
  term1_end_date: string | null // 'YYYY-MM-DD'
  term2_end_date: string | null
  clearing_period_days: number
  notice_text: string | null // 학생 페이지에 보여줄 공지 문구 (관리자가 직접 수정)
  agreement_text: string | null // 신청 완료 직전 "사물함 이용 안내 동의"에 보여줄 문구 (관리자가 직접 수정)
}

// 화면에 보여줄 실제 상태 (DB status에 'clearing'/'expired'를 계산해서 얹은 것)
export type LockerDisplayStatus = LockerRequestStatus | 'clearing' | 'expired'

// 관리자가 도면에서 직접 옮긴 위치/크기/이름 (요소 id별로, 바뀐 것만 저장됨)
export interface LockerLayoutOverride {
  x: number
  y: number
  w: number
  h: number
  label?: string
  // 사물함 블록 전용: 관리자가 번호 범위·열 개수를 바꿨을 때
  rangeStart?: number
  rangeEnd?: number
  cols?: number
}
export type LockerLayoutOverrides = Record<string, LockerLayoutOverride>
