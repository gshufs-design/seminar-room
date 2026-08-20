'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import LockerFloorMap from '@/components/lockers/LockerFloorMap'
import LockerLobbyScene from '@/components/lockers/LockerLobbyScene'
import LockerReadingScene from '@/components/lockers/LockerReadingScene'
import { getLockerStatuses, getLockerSettings } from '@/lib/actions/lockers'
import { LOCKER_ZONES } from '@/lib/lockers/data'
import type { LockerStatusEntry, LockerSettings } from '@/types'
import { Info, CalendarDays, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_SETTINGS: LockerSettings = {
  applications_open: false,
  term1_end_date: null,
  term2_end_date: null,
  clearing_period_days: 7,
  notice_text: null,
  agreement_text: null,
}

export default function LockersPage() {
  const [statuses, setStatuses] = useState<LockerStatusEntry[]>([])
  const [settings, setSettings] = useState<LockerSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)

  const loadStatuses = useCallback(async () => {
    const data = await getLockerStatuses()
    setStatuses(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStatuses()
    getLockerSettings().then(setSettings)
  }, [loadStatuses])

  const selectedZone = LOCKER_ZONES.find((z) => z.id === selectedZoneId) ?? null

  return (
    <>
      <Header />
      <main className="w-full max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedZone ? `${selectedZone.label} 사물함` : '사물함 신청'}
            </h1>
            <p className="text-sm text-gray-500 mt-1 whitespace-nowrap">
              {selectedZone ? selectedZone.description : '그림에서 구역을 선택한 후, 원하는 칸을 눌러 신청해 주세요.'}
            </p>
          </div>
          {selectedZone && (
            <button
              onClick={() => setSelectedZoneId(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium text-[#003087] border border-[#003087]/30 hover:bg-[#003087]/5 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              전체 도면
            </button>
          )}
        </div>

        {!settings.applications_open ? (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-sm text-orange-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium">현재는 사물함 신청 기간이 아닙니다.</p>
              <p>그림은 자유롭게 둘러보실 수 있으며, 신청은 해당 접수 기간에 열립니다.</p>
              {settings.notice_text && <p className="whitespace-pre-line pt-1">{settings.notice_text}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium">이용 안내</p>
              {settings.notice_text ? (
                <p className="whitespace-pre-line">{settings.notice_text}</p>
              ) : (
                <>
                  <p>신청 후 관리자 승인이 완료되어야 예약이 확정됩니다.</p>
                  <p>
                    6개월(한 학기){settings.term1_end_date ? ` — ${settings.term1_end_date}까지 이용 가능` : ''} 또는
                    {' '}1년(두 학기){settings.term2_end_date ? ` — ${settings.term2_end_date}까지 이용 가능` : ''} 중에서 선택할 수 있습니다.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-40 flex items-center justify-center text-gray-400">
            불러오는 중...
          </div>
        ) : selectedZoneId === 'lobby' ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
            <LockerLobbyScene statuses={statuses} onRefresh={loadStatuses} isAdmin={false} applicationsOpen={settings.applications_open} />
          </div>
        ) : selectedZoneId === 'reading' ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
            <LockerReadingScene statuses={statuses} onRefresh={loadStatuses} isAdmin={false} applicationsOpen={settings.applications_open} />
          </div>
        ) : (
          <LockerFloorMap statuses={statuses} onSelectZone={setSelectedZoneId} isAdmin={false} />
        )}

        <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <Link
            href="/my-reservations"
            className="flex items-center gap-2 text-[#003087] hover:underline text-sm font-medium"
          >
            <CalendarDays className="w-4 h-4" />
            내 신청 조회하기
          </Link>
        </div>
      </main>
    </>
  )
}
