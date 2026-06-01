'use client'

import { useState } from 'react'
import Input from './ui/Input'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Modal from './ui/Modal'
import { getUserReservations, cancelReservation, getRoomPassword } from '@/lib/actions/reservations'
import { padHour, formatDate } from '@/lib/utils'
import type { Reservation } from '@/types'
import { KeyRound, Loader2, AlertTriangle } from 'lucide-react'

export default function MyReservations() {
  const [studentId, setStudentId] = useState('')
  const [phone, setPhone] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  // Password reveal state
  const [passwordModal, setPasswordModal] = useState<{open: boolean; reservationId: string; password?: string; error?: string; loading: boolean}>({
    open: false, reservationId: '', loading: false,
  })

  // Cancel state
  const [cancelModal, setCancelModal] = useState<{open: boolean; reservation: Reservation | null}>({
    open: false, reservation: null,
  })
  const [cancelLoading, setCancelLoading] = useState(false)

  const handleSearch = async () => {
    setError('')
    if (!studentId.trim() || !phone.trim()) {
      setError('학번과 연락처를 모두 입력해 주세요.')
      return
    }
    setLoading(true)
    const data = await getUserReservations(studentId.trim(), phone.replace(/-/g, ''))
    setLoading(false)
    setReservations(data)
    setSearched(true)
  }

  const handlePasswordReveal = async (reservationId: string) => {
    setPasswordModal({ open: true, reservationId, loading: true })
    const result = await getRoomPassword(reservationId, studentId.trim(), phone.replace(/-/g, ''))
    setPasswordModal({ open: true, reservationId, loading: false, password: result.password, error: result.error })
  }

  const handleCancelConfirm = async () => {
    if (!cancelModal.reservation) return
    setCancelLoading(true)
    const result = await cancelReservation(cancelModal.reservation.id, studentId.trim(), phone.replace(/-/g, ''))
    setCancelLoading(false)

    if (result.success) {
      setCancelModal({ open: false, reservation: null })
      await handleSearch()
    } else {
      alert(result.error ?? '취소에 실패했습니다.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">예약 조회</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="학번"
            required
            placeholder="2024123456"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <Input
            label="연락처"
            required
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <Button className="mt-4 w-full sm:w-auto" onClick={handleSearch} loading={loading}>
          조회하기
        </Button>
      </div>

      {/* Results */}
      {searched && (
        <>
          {reservations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center text-gray-500">
              예약 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">총 {reservations.length}건의 예약 내역</p>
              {reservations.map((r) => (
                <div key={r.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge status={r.status} size="sm" />
                        <span className="text-xs text-gray-400">#{r.reservation_number}</span>
                      </div>
                      <div className="text-base font-semibold text-gray-900">
                        {formatDate(r.reservation_date, 'yyyy년 MM월 dd일 (E)')} &nbsp;
                        {padHour(parseInt(r.start_time))} ~ {padHour(parseInt(r.end_time))}
                      </div>
                      <div className="text-sm text-gray-500">
                        사용 인원: {r.participant_count}명
                      </div>
                      {r.admin_memo && (
                        <div className="text-sm text-blue-700 bg-blue-50 rounded px-3 py-1.5 mt-2">
                          <span className="font-medium">관리자 메모:</span> {r.admin_memo}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 items-start sm:items-end">
                      {r.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePasswordReveal(r.id)}
                        >
                          <KeyRound className="w-4 h-4" />
                          비밀번호 확인
                        </Button>
                      )}
                      {(r.status === 'pending' || r.status === 'approved') && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setCancelModal({ open: true, reservation: r })}
                        >
                          예약 취소
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Password modal */}
      <Modal
        isOpen={passwordModal.open}
        onClose={() => setPasswordModal({ open: false, reservationId: '', loading: false })}
        title="세미나실 비밀번호"
        size="sm"
      >
        {passwordModal.loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-[#003087]" />
          </div>
        ) : passwordModal.error ? (
          <div className="text-center py-4">
            <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700">{passwordModal.error}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">세미나실 비밀번호</p>
            <div className="text-5xl font-bold tracking-widest text-[#003087] py-4 bg-blue-50 rounded-lg">
              {passwordModal.password}
            </div>
            <p className="text-xs text-gray-400 mt-3">이 비밀번호는 승인된 예약자에게만 공개됩니다.</p>
          </div>
        )}
      </Modal>

      {/* Cancel confirm modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, reservation: null })}
        title="예약 취소"
        size="sm"
      >
        {cancelModal.reservation && (
          <div>
            <p className="text-sm text-gray-700 mb-4">
              아래 예약을 취소하시겠습니까?
            </p>
            <div className="bg-gray-50 rounded p-4 text-sm space-y-1 mb-6">
              <div><span className="text-gray-500">날짜:</span> {formatDate(cancelModal.reservation.reservation_date, 'yyyy년 MM월 dd일')}</div>
              <div>
                <span className="text-gray-500">시간:</span>&nbsp;
                {padHour(parseInt(cancelModal.reservation.start_time))} ~&nbsp;
                {padHour(parseInt(cancelModal.reservation.end_time))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCancelModal({ open: false, reservation: null })} className="flex-1">
                돌아가기
              </Button>
              <Button variant="danger" onClick={handleCancelConfirm} loading={cancelLoading} className="flex-1">
                취소 확인
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
