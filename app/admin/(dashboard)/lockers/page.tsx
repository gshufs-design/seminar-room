'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAllLockerRequests, updateLockerRequestStatus, deleteLockerRequest, getLockerSettings } from '@/lib/actions/lockers'
import { TERM_LABELS, formatPhone, requestTermEndDate, todayISOKst, computeDisplayStatus, diffDaysISO, addDaysISO, termEndLabel } from '@/lib/lockers/data'
import type { LockerRequest, LockerRequestStatus, LockerSettings } from '@/types'
import { Check, X, RotateCcw, ClipboardList, MapPin, Settings, Search, Download, Trash2 } from 'lucide-react'
import AdminLockerLayoutEditor from '@/components/lockers/AdminLockerLayoutEditor'
import AdminLockerSettingsPanel from '@/components/lockers/AdminLockerSettingsPanel'

type DisplayStatus = LockerRequestStatus | 'clearing'
type Filter = LockerRequestStatus | 'all' | 'urgent'
type PageView = 'requests' | 'layout' | 'settings'

const STATUS_STYLE: Record<DisplayStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  approved: 'bg-blue-100 text-blue-900 border border-blue-300',
  clearing: 'bg-orange-100 text-orange-700 border border-orange-300',
  rejected: 'bg-red-100 text-red-700 border border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border border-gray-300',
  expired: 'bg-orange-100 text-orange-700 border border-orange-300',
}
const STATUS_LABEL: Record<DisplayStatus, string> = {
  pending: '대기중',
  approved: '승인됨',
  clearing: '비우는 중',
  rejected: '거절됨',
  cancelled: '본인 취소',
  expired: '이용 만료',
}

/** D-day 뱃지 문구 ("D-14" / "D-day" / 이미 지났으면 "마감") */
function ddayLabel(daysLeft: number): string {
  if (daysLeft > 0) return `D-${daysLeft}`
  if (daysLeft === 0) return 'D-day'
  return '마감'
}

function toCsv(rows: LockerRequest[]): string {
  const header = ['위치', '블록', '번호', '학과', '이름', '학번(사번)', '연락처', '이메일', '신청학기', '이용마감일', '상태', '신청일시']
  const lines = rows.map((r) => {
    const endDate = requestTermEndDate(r.term, r.created_at)
    const values = [
      r.zone_label,
      r.block_label,
      String(r.locker_number),
      r.department,
      r.name,
      r.student_id,
      formatPhone(r.phone),
      r.email,
      TERM_LABELS[r.term] ?? r.term,
      endDate,
      STATUS_LABEL[r.status],
      new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    ]
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  return [header.join(','), ...lines].join('\r\n')
}

export default function AdminLockersPage() {
  const [pageView, setPageView] = useState<PageView>('requests')
  const [requests, setRequests] = useState<LockerRequest[]>([])
  const [settings, setSettings] = useState<LockerSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')
  const [expiryFilter, setExpiryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [data, settingsData] = await Promise.all([getAllLockerRequests('all'), getLockerSettings()])
    setRequests(data)
    setSettings(settingsData)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const clearingDays = settings?.clearing_period_days ?? 7

  const displayStatusOf = useCallback(
    (r: LockerRequest): DisplayStatus => computeDisplayStatus(r.status, r.term, r.created_at, clearingDays),
    [clearingDays]
  )

  const handleUpdate = async (id: string, status: LockerRequestStatus) => {
    setBusyId(id)
    const result = await updateLockerRequestStatus(id, status)
    if (!result.success) {
      alert(result.error ?? '처리 중 오류가 발생했습니다.')
    } else {
      await load()
    }
    setBusyId(null)
  }

  const handleDelete = async (r: LockerRequest) => {
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    setBusyId(r.id)
    const result = await deleteLockerRequest(r.id)
    if (!result.success) {
      alert(result.error ?? '삭제 중 오류가 발생했습니다.')
    } else {
      await load()
    }
    setBusyId(null)
  }

  const today = todayISOKst()

  const counts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    expired: requests.filter((r) => r.status === 'expired').length,
    urgent: requests.filter((r) => {
      if (displayStatusOf(r) !== 'approved') return false
      const endDate = requestTermEndDate(r.term, r.created_at)
      return diffDaysISO(today, endDate) <= 7
    }).length,
  }

  const expiredRequests = useMemo(() => requests.filter((r) => r.status === 'expired'), [requests])

  const expiryLabels = useMemo(
    () => Array.from(new Set(expiredRequests.map((r) => termEndLabel(requestTermEndDate(r.term, r.created_at))))).sort(),
    [expiredRequests]
  )

  const statusFiltered =
    filter === 'all'
      ? requests
      : filter === 'urgent'
      ? requests.filter((r) => {
          if (displayStatusOf(r) !== 'approved') return false
          const endDate = requestTermEndDate(r.term, r.created_at)
          return diffDaysISO(today, endDate) <= 7
        })
      : filter === 'expired'
      ? expiredRequests.filter(
          (r) => expiryFilter === 'all' || termEndLabel(requestTermEndDate(r.term, r.created_at)) === expiryFilter
        )
      : requests.filter((r) => r.status === filter)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return statusFiltered
    return statusFiltered.filter((r) =>
      [r.name, r.student_id, r.phone, r.email, r.department, r.zone_label, r.block_label, String(r.locker_number)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [statusFiltered, search])

  const tabs: { id: Filter; label: string }[] = [
    { id: 'pending', label: `대기중 ${counts.pending}` },
    { id: 'approved', label: `승인됨 ${counts.approved}` },
    { id: 'urgent', label: `마감 임박 ${counts.urgent}` },
    { id: 'expired', label: `이용 만료 ${counts.expired}` },
    { id: 'rejected', label: `거절됨 ${counts.rejected}` },
    { id: 'all', label: '전체' },
  ]

  const handleExport = () => {
    const csv = toCsv(filtered)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = todayISOKst()
    a.href = url
    a.download = `사물함신청내역_${stamp}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">사물함 관리</h1>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setPageView('requests')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            pageView === 'requests' ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          신청 관리
          {counts.pending > 0 && (
            <span className="ml-1 bg-yellow-100 text-yellow-800 text-[11px] font-bold rounded-full px-1.5 py-0.5">{counts.pending}</span>
          )}
        </button>
        <button
          onClick={() => setPageView('layout')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            pageView === 'layout' ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          도면 보기
        </button>
        <button
          onClick={() => setPageView('settings')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            pageView === 'settings' ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          설정
        </button>
      </div>

      {pageView === 'layout' ? (
        <AdminLockerLayoutEditor />
      ) : pageView === 'settings' ? (
        <AdminLockerSettingsPanel />
      ) : (
        <>
          {counts.pending > 0 && (
            <p className="text-sm text-yellow-600 font-medium mb-4">⚠ 승인 대기 중인 신청이 {counts.pending}건 있습니다.</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: '전체', value: requests.length, color: 'text-gray-700' },
              { label: '신청 대기', value: counts.pending, color: 'text-yellow-600' },
              { label: '승인', value: counts.approved, color: 'text-[#003087]' },
              { label: '거절', value: counts.rejected, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름, 학번(사번), 연락처, 이메일로 검색합니다"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              엑셀로 내보내기 (CSV)
            </button>
          </div>

          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setFilter(id); if (id !== 'expired') setExpiryFilter('all') }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  filter === id ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filter === 'expired' && expiryLabels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <span className="text-xs text-gray-500 mr-1">만료 학기</span>
              <button
                onClick={() => setExpiryFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  expiryFilter === 'all'
                    ? 'bg-[#003087] text-white border-[#003087]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                전체
              </button>
              {expiryLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => setExpiryFilter(label)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    expiryFilter === label
                      ? 'bg-[#003087] text-white border-[#003087]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-gray-400">불러오는 중입니다...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">해당하는 신청 내역이 없습니다.</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">위치</th>
                    <th className="text-left px-4 py-3 font-medium">신청자</th>
                    <th className="text-left px-4 py-3 font-medium">연락처</th>
                    <th className="text-left px-4 py-3 font-medium">학기</th>
                    <th className="text-left px-4 py-3 font-medium">상태</th>
                    {filter === 'expired' ? (
                      <th className="text-left px-4 py-3 font-medium">만료 학기</th>
                    ) : (
                      <th className="text-left px-4 py-3 font-medium">D-day</th>
                    )}
                    <th className="text-right px-4 py-3 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => {
                    const endDate = requestTermEndDate(r.term, r.created_at)
                    const display = displayStatusOf(r)
                    let ddayText: string | null = null
                    if (display === 'pending' || display === 'approved') {
                      ddayText = ddayLabel(diffDaysISO(today, endDate))
                    } else if (display === 'clearing') {
                      const clearEnd = addDaysISO(endDate, clearingDays)
                      ddayText = ddayLabel(diffDaysISO(today, clearEnd))
                    }
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-gray-900">{r.zone_label}</p>
                          <p className="text-xs text-gray-500">
                            {r.block_label} · {r.locker_number}번
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-500">
                            {r.department} · {r.student_id}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-700">
                          <p>{formatPhone(r.phone)}</p>
                          <p className="text-xs text-gray-500">{r.email}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-gray-700">
                          <p>{TERM_LABELS[r.term] ?? r.term}</p>
                          <p className="text-xs text-gray-500">📅 {endDate}까지</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex items-center rounded-full font-medium text-xs px-2.5 py-0.5 ${STATUS_STYLE[display]}`}>
                            {STATUS_LABEL[display]}
                          </span>
                        </td>
                        {filter === 'expired' ? (
                          <td className="px-4 py-3 align-top text-gray-700">{termEndLabel(endDate)}</td>
                        ) : (
                          <td className="px-4 py-3 align-top text-gray-700">{ddayText ?? '-'}</td>
                        )}
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {r.status === 'pending' ? (
                              <>
                                <button
                                  disabled={busyId === r.id}
                                  onClick={() => handleUpdate(r.id, 'approved')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-[#003087] text-white hover:bg-[#1e3d7d] disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  승인
                                </button>
                                <button
                                  disabled={busyId === r.id}
                                  onClick={() => handleUpdate(r.id, 'rejected')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  거절
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={busyId === r.id}
                                onClick={() => handleUpdate(r.id, 'pending')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                대기중으로
                              </button>
                            )}
                            <button
                              disabled={busyId === r.id}
                              onClick={() => handleDelete(r)}
                              className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
