'use client'

import { useState } from 'react'
import { updateReservationStatus, updateAdminMemo, adminCancelReservation } from '@/lib/actions/admin'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import type { Reservation, ReservationStatus } from '@/types'
import { formatDate, padHour } from '@/lib/utils'
import { Check, X, FileText, Search, Ban } from 'lucide-react'

interface AdminTableProps {
  reservations: Reservation[]
  onRefresh: () => void
}

type FilterStatus = 'all' | ReservationStatus

export default function AdminTable({ reservations, onRefresh }: AdminTableProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState<{
    open: boolean
    reservation: Reservation | null
    action: 'approve' | 'reject' | null
  }>({ open: false, reservation: null, action: null })
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [memoModal, setMemoModal] = useState<{ open: boolean; reservation: Reservation | null }>({ open: false, reservation: null })
  const [memoText, setMemoText] = useState('')
  const [memoLoading, setMemoLoading] = useState(false)
  const [adminCancelModal, setAdminCancelModal] = useState<{ open: boolean; reservation: Reservation | null }>({ open: false, reservation: null })
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const filtered = reservations.filter((r) => {
    const matchStatus = filter === 'all' || r.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.student_id.includes(q) || r.department.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const handleAction = async () => {
    if (!actionModal.reservation || !actionModal.action) return
    setLoading(true)
    await updateReservationStatus(
      actionModal.reservation.id,
      actionModal.action === 'approve' ? 'approved' : 'rejected',
      memo.trim() || undefined
    )
    setLoading(false)
    setActionModal({ open: false, reservation: null, action: null })
    setMemo('')
    onRefresh()
  }

  const handleAdminCancel = async () => {
    if (!adminCancelModal.reservation) return
    if (!cancelReason.trim()) {
      setCancelError('취소 사유를 입력해 주세요.')
      return
    }
    setCancelLoading(true)
    setCancelError('')
    const result = await adminCancelReservation(adminCancelModal.reservation.id, cancelReason)
    setCancelLoading(false)
    if (result.success) {
      setAdminCancelModal({ open: false, reservation: null })
      setCancelReason('')
      onRefresh()
    } else {
      setCancelError(result.error ?? '처리 중 오류가 발생했습니다.')
    }
  }

  const handleMemoSave = async () => {
    if (!memoModal.reservation) return
    setMemoLoading(true)
    await updateAdminMemo(memoModal.reservation.id, memoText)
    setMemoLoading(false)
    setMemoModal({ open: false, reservation: null })
    onRefresh()
  }

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: '전체', value: 'all' },
    { label: '신청 대기', value: 'pending' },
    { label: '승인', value: 'approved' },
    { label: '거절', value: 'rejected' },
    { label: '취소', value: 'cancelled' },
    { label: '관리자 취소', value: 'admin_cancelled' },
  ]

  return (
    <div>
      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 flex-wrap">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border ${
                filter === btn.value
                  ? 'bg-[#003087] text-white border-[#003087]'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 학번, 학과 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">예약번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">일시</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">신청자</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">학과</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">연락처</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">인원</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">예약 내역이 없습니다.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">#{r.reservation_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatDate(r.reservation_date, 'MM/dd (E)')}</div>
                      <div className="text-gray-500">{padHour(parseInt(r.start_time))} ~ {padHour(parseInt(r.end_time))}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-gray-500">{r.student_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.department}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.phone}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.participant_count}명</td>
                    <td className="px-4 py-3 text-center">
                      <Badge status={r.status} size="sm" />
                      {r.admin_memo && (
                        <div className="text-xs text-gray-400 mt-1 max-w-[120px] mx-auto truncate" title={r.admin_memo}>
                          {r.admin_memo}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setActionModal({ open: true, reservation: r, action: 'approve' }); setMemo(r.admin_memo ?? '') }}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                              title="승인"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setActionModal({ open: true, reservation: r, action: 'reject' }); setMemo(r.admin_memo ?? '') }}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                              title="거절"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <button
                            onClick={() => { setAdminCancelModal({ open: true, reservation: r }); setCancelReason(''); setCancelError('') }}
                            className="p-1.5 rounded hover:bg-orange-50 text-orange-500 hover:text-orange-600 transition-colors"
                            title="관리자 취소"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { setMemoModal({ open: true, reservation: r }); setMemoText(r.admin_memo ?? '') }}
                          className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-[#003087] transition-colors"
                          title="메모"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ open: false, reservation: null, action: null })}
        title={actionModal.action === 'approve' ? '예약 승인' : '예약 거절'}
        size="md"
      >
        {actionModal.reservation && (
          <div>
            <div className="bg-gray-50 rounded p-4 text-sm space-y-1.5 mb-5">
              <div><span className="text-gray-500">신청자:</span> {actionModal.reservation.name} ({actionModal.reservation.department})</div>
              <div><span className="text-gray-500">학번:</span> {actionModal.reservation.student_id}</div>
              <div><span className="text-gray-500">연락처:</span> {actionModal.reservation.phone}</div>
              <div>
                <span className="text-gray-500">일시:</span>&nbsp;
                {formatDate(actionModal.reservation.reservation_date, 'yyyy년 MM월 dd일')}&nbsp;
                {padHour(parseInt(actionModal.reservation.start_time))} ~ {padHour(parseInt(actionModal.reservation.end_time))}
              </div>
              <div><span className="text-gray-500">인원:</span> {actionModal.reservation.participant_count}명</div>
              {actionModal.reservation.purpose && (
                <div><span className="text-gray-500">사용 목적:</span> {actionModal.reservation.purpose}</div>
              )}
              {actionModal.reservation.co_users && actionModal.reservation.co_users.length > 0 && (
                <div>
                  <span className="text-gray-500">동반 이용자:</span>
                  <ul className="mt-1 ml-2 space-y-0.5">
                    {actionModal.reservation.co_users.map((cu, idx) => (
                      <li key={idx} className="text-gray-700">· {cu.name} ({cu.department}, {cu.student_id})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">관리자 메모 (선택)</label>
              <textarea
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="안내 사항이 있으면 입력해 주세요. (사용자에게 공개됩니다)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActionModal({ open: false, reservation: null, action: null })} className="flex-1">
                취소
              </Button>
              <Button
                variant={actionModal.action === 'approve' ? 'primary' : 'danger'}
                onClick={handleAction}
                loading={loading}
                className="flex-1"
              >
                {actionModal.action === 'approve' ? '승인' : '거절'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Memo Modal */}
      <Modal
        isOpen={memoModal.open}
        onClose={() => setMemoModal({ open: false, reservation: null })}
        title="관리자 메모 편집"
        size="md"
      >
        <div>
          <textarea
            rows={4}
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="메모 내용을 입력하세요."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] resize-none mb-4"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setMemoModal({ open: false, reservation: null })} className="flex-1">취소</Button>
            <Button onClick={handleMemoSave} loading={memoLoading} className="flex-1">저장</Button>
          </div>
        </div>
      </Modal>

      {/* Admin Cancel Modal */}
      <Modal
        isOpen={adminCancelModal.open}
        onClose={() => { setAdminCancelModal({ open: false, reservation: null }); setCancelReason(''); setCancelError('') }}
        title="관리자 취소"
        size="md"
      >
        {adminCancelModal.reservation && (
          <div>
            <div className="bg-gray-50 rounded p-4 text-sm space-y-1.5 mb-5">
              <div><span className="text-gray-500">신청자:</span> {adminCancelModal.reservation.name} ({adminCancelModal.reservation.department})</div>
              <div><span className="text-gray-500">학번:</span> {adminCancelModal.reservation.student_id}</div>
              <div><span className="text-gray-500">연락처:</span> {adminCancelModal.reservation.phone}</div>
              <div>
                <span className="text-gray-500">일시:</span>&nbsp;
                {formatDate(adminCancelModal.reservation.reservation_date, 'yyyy년 MM월 dd일')}&nbsp;
                {padHour(parseInt(adminCancelModal.reservation.start_time))} ~ {padHour(parseInt(adminCancelModal.reservation.end_time))}
              </div>
              {adminCancelModal.reservation.purpose && (
                <div><span className="text-gray-500">사용 목적:</span> {adminCancelModal.reservation.purpose}</div>
              )}
              {adminCancelModal.reservation.co_users && adminCancelModal.reservation.co_users.length > 0 && (
                <div>
                  <span className="text-gray-500">동반 이용자:</span>
                  <ul className="mt-1 ml-2 space-y-0.5">
                    {adminCancelModal.reservation.co_users.map((cu, idx) => (
                      <li key={idx} className="text-gray-700">· {cu.name} ({cu.department}, {cu.student_id})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                취소 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); setCancelError('') }}
                placeholder="취소 사유를 입력해 주세요. (사용자에게 공개됩니다)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              {cancelError && <p className="mt-1 text-sm text-red-500">{cancelError}</p>}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setAdminCancelModal({ open: false, reservation: null }); setCancelReason(''); setCancelError('') }}
                className="flex-1"
              >
                돌아가기
              </Button>
              <Button variant="danger" onClick={handleAdminCancel} loading={cancelLoading} className="flex-1">
                취소 확정
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
