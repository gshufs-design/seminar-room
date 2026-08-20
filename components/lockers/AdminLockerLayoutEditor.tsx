'use client'

import { useState, useEffect, useCallback } from 'react'
import LockerFloorMap from './LockerFloorMap'
import LockerLobbyScene from './LockerLobbyScene'
import LockerReadingScene from './LockerReadingScene'
import { getLockerStatuses, getAllLockerRequests } from '@/lib/actions/lockers'
import { LOCKER_ZONES } from '@/lib/lockers/data'
import type { LockerStatusEntry, LockerRequest } from '@/types'
import { ArrowLeft } from 'lucide-react'

export default function AdminLockerLayoutEditor() {
  const [statuses, setStatuses] = useState<LockerStatusEntry[]>([])
  const [requests, setRequests] = useState<LockerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const [statusData, requestData] = await Promise.all([getLockerStatuses(), getAllLockerRequests('all')])
    setStatuses(statusData)
    setRequests(requestData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const selectedZone = LOCKER_ZONES.find((z) => z.id === selectedZoneId) ?? null

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{selectedZone ? `${selectedZone.label} 도면 보기` : '도면 보기'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedZone ? '박스를 드래그·크기조절·이름 수정할 수 있습니다.' : '편집할 도면을 선택합니다. 학생들이 보는 화면에 바로 반영됩니다.'}
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

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-40 flex items-center justify-center text-gray-400">
          불러오는 중...
        </div>
      ) : (
        // 이용자 페이지(app/lockers/page.tsx)와 같은 max-w-5xl 컨테이너 폭을 맞춰줘야,
        // MapViewport의 확대 비율 계산이 양쪽에서 동일하게 나와서 도면이 같은 비율로 보입니다.
        <div className="max-w-5xl mx-auto">
          {selectedZoneId === 'lobby' ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
              <LockerLobbyScene statuses={statuses} onRefresh={loadAll} isAdmin adminView requests={requests} />
            </div>
          ) : selectedZoneId === 'reading' ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
              <LockerReadingScene statuses={statuses} onRefresh={loadAll} isAdmin adminView requests={requests} />
            </div>
          ) : (
            <LockerFloorMap statuses={statuses} onSelectZone={setSelectedZoneId} isAdmin />
          )}
        </div>
      )}
    </div>
  )
}
