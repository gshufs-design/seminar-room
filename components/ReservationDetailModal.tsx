'use client'

import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import type { Reservation } from '@/types'
import { formatDate, padHour } from '@/lib/utils'

interface ReservationDetailModalProps {
  reservation: Reservation | null
  open: boolean
  onClose: () => void
}

export default function ReservationDetailModal({ reservation, open, onClose }: ReservationDetailModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`예약 상세 #${reservation?.reservation_number ?? ''}`}
      size="md"
    >
      {reservation && (() => {
        const r = reservation
        return (
          <div className="space-y-4 text-sm">
            {/* 신청자 정보 */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">신청자 정보</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
                <div className="flex gap-2"><span className="text-gray-500 w-16 shrink-0">이름</span><span className="font-medium text-gray-900">{r.name}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 w-16 shrink-0">학과</span><span className="text-gray-800">{r.department}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 w-16 shrink-0">학번</span><span className="text-gray-800">{r.student_id}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 w-16 shrink-0">연락처</span><span className="text-gray-800">{r.phone}</span></div>
              </div>
            </div>

            {/* 예약 정보 */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">예약 정보</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-16 shrink-0">일시</span>
                  <span className="text-gray-800">
                    {formatDate(r.reservation_date, 'yyyy년 MM월 dd일')} {padHour(parseInt(r.start_time))} ~ {padHour(parseInt(r.end_time))}
                  </span>
                </div>
                <div className="flex gap-2"><span className="text-gray-500 w-16 shrink-0">사용 인원</span><span className="text-gray-800">{r.participant_count}명</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500 w-16 shrink-0">상태</span><Badge status={r.status} size="sm" /></div>
              </div>
            </div>

            {/* 사용 목적 */}
            {r.purpose && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">사용 목적</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">{r.purpose}</div>
              </div>
            )}

            {/* 동반 이용자 */}
            {r.co_users && r.co_users.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">동반 이용자 ({r.co_users.length}명)</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {r.co_users.map((cu, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-gray-400 shrink-0">{idx + 1}.</span>
                      <span className="text-gray-800">{cu.name} · {cu.department} · {cu.student_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 관리자 메모 */}
            {r.admin_memo && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">관리자 메모</h4>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">{r.admin_memo}</div>
              </div>
            )}

            <Button variant="outline" onClick={onClose} className="w-full">닫기</Button>
          </div>
        )
      })()}
    </Modal>
  )
}
