export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'admin_cancelled'

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
