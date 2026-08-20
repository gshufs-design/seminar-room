'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getLockerSettings,
  updateLockerSettings,
  getDuplicateExceptions,
  addDuplicateException,
  removeDuplicateException,
  type LockerDuplicateException,
} from '@/lib/actions/lockers'
import type { LockerSettings } from '@/types'
import { CheckCircle2, X } from 'lucide-react'

export default function AdminLockerSettingsPanel() {
  const [settings, setSettings] = useState<LockerSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [exceptions, setExceptions] = useState<LockerDuplicateException[]>([])
  const [newExceptionId, setNewExceptionId] = useState('')
  const [newExceptionNote, setNewExceptionNote] = useState('')
  const [addingException, setAddingException] = useState(false)

  const loadExceptions = useCallback(async () => {
    const data = await getDuplicateExceptions()
    setExceptions(data)
  }, [])

  const load = useCallback(async () => {
    const data = await getLockerSettings()
    setSettings(data)
  }, [])

  useEffect(() => {
    load()
    loadExceptions()
  }, [load, loadExceptions])

  const flashSaved = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const save = async (patch: Partial<LockerSettings>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next) // 낙관적 업데이트
    setSaving(true)
    const result = await updateLockerSettings(patch)
    setSaving(false)
    if (!result.success) {
      alert(result.error ?? '저장 중 오류가 발생했습니다.')
      load() // 실패하면 실제 값으로 되돌림
      return
    }
    flashSaved()
  }

  if (!settings) {
    return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
  }

  const handleAddException = async () => {
    if (!newExceptionId.trim()) return
    setAddingException(true)
    const result = await addDuplicateException(newExceptionId.trim(), newExceptionNote)
    setAddingException(false)
    if (!result.success) {
      alert(result.error ?? '등록 중 오류가 발생했습니다.')
      return
    }
    setNewExceptionId('')
    setNewExceptionNote('')
    loadExceptions()
  }

  const handleRemoveException = async (studentId: string) => {
    const result = await removeDuplicateException(studentId)
    if (!result.success) {
      alert(result.error ?? '삭제 중 오류가 발생했습니다.')
      return
    }
    loadExceptions()
  }

  return (
    <div className="max-w-xl space-y-8">
      {/* 신청 접수 온오프 */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">사물함 신청 접수</h3>
            <p className="text-sm text-gray-500 mt-1">
              학기 시작할 때 켜고, 다음 신청 받기 전까지 꺼두는 식으로 사용하시면 됩니다.
            </p>
          </div>
          <button
            onClick={() => save({ applications_open: !settings.applications_open })}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
              settings.applications_open ? 'bg-[#003087]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.applications_open ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className={`mt-3 text-sm font-medium ${settings.applications_open ? 'text-green-700' : 'text-gray-500'}`}>
          {settings.applications_open ? '● 지금 신청 받는 중입니다.' : '○ 지금은 신청을 받지 않습니다. (학생 화면에 안내 문구가 떠요)'}
        </p>
      </section>

      {/* 학기별 이용 마감일 */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900">학기별 이용 마감일</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          이 날짜까지 사용할 수 있다고 학생들에게 표시됩니다. 비워두면 마감일 없이 계속 사용 가능한 것으로 처리됩니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">6개월(한 학기) 마감일</label>
            <input
              type="date"
              value={settings.term1_end_date ?? ''}
              onChange={(e) => save({ term1_end_date: e.target.value || null })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">1년(두 학기) 마감일</label>
            <input
              type="date"
              value={settings.term2_end_date ?? ''}
              onChange={(e) => save({ term2_end_date: e.target.value || null })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
        </div>
      </section>

      {/* 비우는 기간 */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900">비우는 기간</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          마감일이 지나면 이 기간 동안 &quot;비우는 중&quot; 상태로 표시됩니다. 이 기간까지 지나면 그 칸은
          자동으로 다시 신청 가능한 빈 자리가 됩니다.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={settings.clearing_period_days}
            onChange={(e) => save({ clearing_period_days: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            className="w-24 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
          />
          <span className="text-sm text-gray-600">일</span>
        </div>
      </section>

      {/* 학생 페이지 공지 문구 */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900">학생 페이지 공지 문구</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          사물함 신청 화면 상단 안내문에 직접 쓰신 문구가 표시됩니다. 비워두면 기본 안내문이 표시됩니다.
        </p>
        <textarea
          defaultValue={settings.notice_text ?? ''}
          onBlur={(e) => save({ notice_text: e.target.value.trim() || null })}
          rows={4}
          placeholder="예) 이번 학기 사물함 신청은 8월 25일부터 9월 5일까지입니다. 문의사항은 총학생회실로 연락 주시기 바랍니다."
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 resize-y"
        />
      </section>

      {/* 사물함 이용 안내 동의 문구 */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900">사물함 이용 안내 동의</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          학생이 정보를 입력하는 화면에 있는 &quot;사물함 이용 안내 동의&quot; 버튼을 누르면 이 문구가
          표시됩니다. 학생이 내용을 확인하고 동의해야 신청을 완료할 수 있습니다. 비워두면 기본 안내문이 표시됩니다.
        </p>
        <textarea
          defaultValue={settings.agreement_text ?? ''}
          onBlur={(e) => save({ agreement_text: e.target.value.trim() || null })}
          rows={6}
          placeholder="예) 1. 사물함은 학기 단위로 이용하며, 마감일 이후 미회수 물품은 임의 폐기될 수 있습니다.&#10;2. 타인에게 사물함을 양도하거나 대여할 수 없습니다.&#10;3. 파손·분실 시 원상복구 비용은 이용자 본인이 부담합니다."
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 resize-y"
        />
      </section>

      {/* 중복 신청 예외 허용 */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900">중복 신청 예외 허용</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          기본적으로 한 사람은 사물함을 1개만 신청할 수 있습니다(학번·연락처·이메일로 확인). 아래에
          학번(사번)을 등록해두면 그 사람만 여러 개를 신청할 수 있습니다. 학생에게 별도로 안내되지는 않습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={newExceptionId}
            onChange={(e) => setNewExceptionId(e.target.value)}
            placeholder="학번(사번)"
            className="w-full sm:w-36 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
          />
          <input
            type="text"
            value={newExceptionNote}
            onChange={(e) => setNewExceptionNote(e.target.value)}
            placeholder="메모(선택) — 예) 홍길동, 조교 겸용"
            className="w-full flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
          />
          <button
            onClick={handleAddException}
            disabled={!newExceptionId.trim() || addingException}
            className="px-4 py-2 rounded text-sm font-medium bg-[#003087] text-white hover:bg-[#1e3d7d] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            등록
          </button>
        </div>

        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 예외가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded">
            {exceptions.map((ex) => (
              <li key={ex.student_id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{ex.student_id}</span>
                  {ex.note && <span className="text-gray-500 ml-2">{ex.note}</span>}
                </div>
                <button
                  onClick={() => handleRemoveException(ex.student_id)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                  title="삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="h-5">
        {saving && <p className="text-xs text-gray-400">저장 중입니다...</p>}
        {savedFlash && !saving && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 저장됐습니다
          </p>
        )}
      </div>
    </div>
  )
}
