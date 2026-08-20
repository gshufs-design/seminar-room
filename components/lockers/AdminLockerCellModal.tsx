'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { TERM_LABELS, formatPhone, requestTermEndDate } from '@/lib/lockers/data'
import { updateLockerRequestStatus } from '@/lib/actions/lockers'
import type { LockerRequest, LockerRequestStatus } from '@/types'
import { Check, X, RotateCcw } from 'lucide-react'

const STATUS_LABEL: Record<LockerRequestStatus, string> = {
  pending: '대기중',
  approved: '승인됨',
  rejected: '거절됨',
  cancelled: '본인 취소',
  expired: '이용 만료',
}
const STATUS_STYLE: Record<LockerRequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  approved: 'bg-blue-100 text-blue-900 border border-blue-300',
  rejected: 'bg-red-100 text-red-700 border border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border border-gray-300',
  expired: 'bg-orange-100 text-orange-700 border border-orange-300',
}

interface AdminLockerCellModalProps {
  request: LockerRequest | null
  onClose: () => void
  onChanged: () => void
}

export default function AdminLockerCellModal({ request, onClose, onChanged }: AdminLockerCellModalProps) {
  const [busy, setBusy] = useState(false)

  if (!request) return null

  const handleUpdate = async (status: LockerRequestStatus) => {
    setBusy(true)
    const result = await updateLockerRequestStatus(request.id, status)
    setBusy(false)
    if (!result.success) {
      alert(result.error ?? '처리 중 오류가 발생했습니다.')
      return
    }
    onChanged()
    onClose()
  }

  return (
    <Modal isOpen={!!request} onClose={onClose} title={`${request.zone_label} · ${request.block_label} · ${request.locker_number}번`} size="sm">
      <div className="space-y-4">
        <span className={`inline-flex items-center rounded-full font-medium text-xs px-2.5 py-1 ${STATUS_STYLE[request.status]}`}>
          {STATUS_LABEL[request.status]}
        </span>

        <dl className="text-sm space-y-2">
          <Row label="학과" value={request.department} />
          <Row label="이름" value={request.name} />
          <Row label="학번(사번)" value={request.student_id} />
          <Row label="연락처" value={formatPhone(request.phone)} />
          <Row label="이메일" value={request.email} />
          <Row label="신청 학기" value={TERM_LABELS[request.term] ?? request.term} />
          <Row label="이용 마감일" value={requestTermEndDate(request.term, request.created_at)} />
        </dl>

        {request.status === 'pending' ? (
          <div className="flex gap-2 pt-2">
            <button
              disabled={busy}
              onClick={() => handleUpdate('approved')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium bg-[#003087] text-white hover:bg-[#1e3d7d] disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              승인
            </button>
            <button
              disabled={busy}
              onClick={() => handleUpdate('rejected')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              거절
            </button>
          </div>
        ) : (
          <button
            disabled={busy}
            onClick={() => handleUpdate('pending')}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium text-gray-500 border border-gray-300 hover:text-gray-700 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            대기중으로 되돌리기
          </button>
        )}
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-1.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  )
}
