'use client'

import { useState } from 'react'
import Input from './ui/Input'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { getUserLockerRequests, cancelLockerRequest, getLockerSettings } from '@/lib/actions/lockers'
import { TERM_LABELS, computeDisplayStatus, termEndDate } from '@/lib/lockers/data'
import type { LockerRequest, LockerRequestStatus, LockerSettings } from '@/types'

type DisplayStatus = LockerRequestStatus | 'clearing'

const STATUS_STYLE: Record<DisplayStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  approved: 'bg-blue-100 text-blue-900 border border-blue-300',
  clearing: 'bg-orange-100 text-orange-700 border border-orange-300',
  expired: 'bg-gray-100 text-gray-600 border border-gray-300',
  rejected: 'bg-red-100 text-red-700 border border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border border-gray-300',
}
const STATUS_LABEL: Record<DisplayStatus, string> = {
  pending: '대기중',
  approved: '이용중',
  clearing: '비우는 중',
  expired: '이용 만료',
  rejected: '거절됨',
  cancelled: '취소됨',
}

export default function MyLockerRequests() {
  const [studentId, setStudentId] = useState('')
  const [phone, setPhone] = useState('')
  const [requests, setRequests] = useState<LockerRequest[]>([])
  const [settings, setSettings] = useState<LockerSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const [cancelModal, setCancelModal] = useState<{ open: boolean; request: LockerRequest | null }>({
    open: false,
    request: null,
  })
  const [cancelLoading, setCancelLoading] = useState(false)

  const handleSearch = async () => {
    setError('')
    if (!studentId.trim() || !phone.trim()) {
      setError('학번(사번)과 연락처를 모두 입력해 주시기 바랍니다.')
      return
    }
    setLoading(true)
    const [data, settingsData] = await Promise.all([
      getUserLockerRequests(studentId.trim(), phone.replace(/-/g, '')),
      getLockerSettings(),
    ])
    setLoading(false)
    setRequests(data)
    setSettings(settingsData)
    setSearched(true)
  }

  const handleCancelConfirm = async () => {
    if (!cancelModal.request) return
    setCancelLoading(true)
    const result = await cancelLockerRequest(cancelModal.request.id, studentId.trim(), phone.replace(/-/g, ''))
    setCancelLoading(false)

    if (result.success) {
      setCancelModal({ open: false, request: null })
      await handleSearch()
    } else {
      alert(result.error ?? '취소에 실패했습니다.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">사물함 신청 조회</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="학번(사번)"
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
          {requests.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center text-gray-500">
              신청 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">총 {requests.length}건의 신청 내역</p>
              {requests.map((r) => {
                const display: DisplayStatus = settings ? computeDisplayStatus(r.status, r.term, settings) : r.status
                const endDate = settings ? termEndDate(r.term, settings) : null
                return (
                  <div key={r.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded-full font-medium text-xs px-2.5 py-0.5 ${STATUS_STYLE[display]}`}
                        >
                          {STATUS_LABEL[display]}
                        </span>
                        <div className="text-base font-semibold text-gray-900">
                          {r.zone_label} · {r.block_label} · {r.locker_number}번
                        </div>
                        <div className="text-sm text-gray-500">신청 학기: {TERM_LABELS[r.term] ?? r.term}</div>
                        {endDate && (display === 'approved' || display === 'clearing') && (
                          <div className="text-sm text-gray-500">📅 이용 마감일: {endDate}</div>
                        )}
                        {display === 'clearing' && (
                          <div className="text-sm text-orange-700 bg-orange-50 rounded px-3 py-1.5 mt-2">
                            이용 마감일이 지났습니다. 빠른 시일 내에 사물함을 비워 주시기 바랍니다.
                          </div>
                        )}
                        {display === 'expired' && (
                          <div className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5 mt-2">
                            이용 기간이 끝나서 이 사물함은 반납 처리되었습니다.
                          </div>
                        )}
                        {r.status === 'rejected' && r.admin_memo && (
                          <div className="text-sm text-red-700 bg-red-50 rounded px-3 py-1.5 mt-2">
                            <span className="font-medium">거절 사유:</span> {r.admin_memo}
                          </div>
                        )}
                      </div>

                      {(r.status === 'pending' || r.status === 'approved') && (
                        <div className="flex flex-row sm:flex-col gap-2 items-start sm:items-end">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setCancelModal({ open: true, request: r })}
                          >
                            신청 취소
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Cancel confirm modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, request: null })}
        title="사물함 신청 취소"
        size="sm"
      >
        {cancelModal.request && (
          <div>
            <p className="text-sm text-gray-700 mb-4">아래 신청을 취소하시겠습니까?</p>
            <div className="bg-gray-50 rounded p-4 text-sm space-y-1 mb-6">
              <div>
                <span className="text-gray-500">위치:</span> {cancelModal.request.zone_label} ·{' '}
                {cancelModal.request.block_label}
              </div>
              <div>
                <span className="text-gray-500">번호:</span> {cancelModal.request.locker_number}번
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCancelModal({ open: false, request: null })}
                className="flex-1"
              >
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
