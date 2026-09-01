'use client'

import { useState, useEffect } from 'react'
import Button from './ui/Button'
import Modal from './ui/Modal'
import {
  searchReservationIdentities,
  addWarning,
  deleteWarning,
  getAllWarningGroups,
  getWarningNoticeText,
  updateWarningNoticeText,
  type ReservationIdentity,
} from '@/lib/actions/warnings'
import { formatDate } from '@/lib/utils'
import type { WarningGroup } from '@/types'
import { Search, Plus, Info, ShieldAlert, Trash2 } from 'lucide-react'

interface WarningManagerProps {
  initialGroups: WarningGroup[]
  initialNoticeText: string | null
}

export default function WarningManager({ initialGroups, initialNoticeText }: WarningManagerProps) {
  const [groups, setGroups] = useState<WarningGroup[]>(initialGroups)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = async () => {
    const data = await getAllWarningGroups()
    setGroups(data)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    setDeletingId(id)
    const result = await deleteWarning(id)
    setDeletingId(null)
    if (!result.success) {
      alert(result.error ?? '삭제 중 오류가 발생했습니다.')
      return
    }
    await refresh()
  }

  return (
    <div className="space-y-8">
      <NewWarningSection onAdded={refresh} />

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">경고자 목록</h2>
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center text-gray-500">
            등록된 경고가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={`${g.student_id}|${g.name}|${g.phone}`} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{g.name} <span className="text-gray-400 font-normal">({g.department})</span></div>
                    <div className="text-sm text-gray-500">{g.student_id} · {g.phone}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                      경고 {g.status.count}회
                    </span>
                    {g.status.restricted && g.status.restrictedUntil && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                        <ShieldAlert className="w-3 h-3" />
                        이용 제한 중 · 해제일 {formatDate(g.status.restrictedUntil, 'yyyy-MM-dd')}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="space-y-1.5 border-t border-gray-100 pt-3">
                  {g.warnings.map((w) => (
                    <li key={w.id} className="text-sm text-gray-700 flex items-start gap-2 group">
                      <span className="text-gray-400 shrink-0 w-24">{formatDate(w.created_at, 'yyyy-MM-dd')}</span>
                      <span className="flex-1">{w.reason}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(w.id)}
                        disabled={deletingId === w.id}
                        className="p-1 rounded text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                        title="경고 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <WarningNoticeTextSection initialText={initialNoticeText} />
    </div>
  )
}

function NewWarningSection({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ReservationIdentity[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<ReservationIdentity | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || selected) return
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const data = await searchReservationIdentities(q)
      setResults(data)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, open, selected])

  const reset = () => {
    setQuery('')
    setResults([])
    setSelected(null)
    setReason('')
    setError('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!selected) {
      setError('대상자를 검색해서 선택해 주세요.')
      return
    }
    if (!reason.trim()) {
      setError('경고 사유를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    const result = await addWarning({ ...selected, reason: reason.trim() })
    setSubmitting(false)
    if (!result.success) {
      setError(result.error ?? '경고 등록에 실패했습니다.')
      return
    }
    setOpen(false)
    reset()
    onAdded()
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        새 경고 부여
      </Button>

      <Modal isOpen={open} onClose={() => { setOpen(false); reset() }} title="새 경고 부여" size="md">
        <div className="space-y-4">
          {!selected ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">대상자 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름, 학번, 학과로 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
                />
              </div>
              <div className="mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                {searching && <div className="p-3 text-sm text-gray-400 text-center">검색 중...</div>}
                {!searching && query.trim() && results.length === 0 && (
                  <div className="p-3 text-sm text-gray-400 text-center">일치하는 예약 내역이 없습니다.</div>
                )}
                {!searching && results.map((r, idx) => (
                  <button
                    key={`${r.student_id}-${r.name}-${idx}`}
                    type="button"
                    onClick={() => setSelected(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{r.name}</span>
                    <span className="text-gray-400"> · {r.department} · {r.student_id}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 rounded p-3 text-sm text-gray-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#003087]">선택된 대상자</span>
                <button type="button" onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  다시 검색
                </button>
              </div>
              <div>{selected.name} · {selected.department} · {selected.student_id} · {selected.phone}</div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">경고 사유 <span className="text-red-500">*</span></label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="경고 사유를 입력해 주세요."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setOpen(false); reset() }} className="flex-1">취소</Button>
            <Button onClick={handleSubmit} loading={submitting} className="flex-1">경고 등록</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function WarningNoticeTextSection({ initialText }: { initialText: string | null }) {
  const [text, setText] = useState(initialText ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    setMessage(null)
    setLoading(true)
    const result = await updateWarningNoticeText(text.trim() || null)
    setLoading(false)
    if (result.success) {
      setMessage({ type: 'success', text: '안내 문구가 저장되었습니다.' })
    } else {
      setMessage({ type: 'error', text: result.error ?? '저장에 실패했습니다.' })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Info className="w-5 h-5 text-[#003087]" />
        <h3 className="font-semibold text-gray-900">경고 안내 문구</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        경고 누적으로 이용이 제한된 이용자에게 보여줄 안내 문구입니다. 비워두면 표시되지 않습니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="예: 경고 2회 누적 시 마지막 경고일로부터 6개월간 세미나실 이용이 제한됩니다. 문의: 총학생회"
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-[#003087]"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={handleSubmit} loading={loading}>저장</Button>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
