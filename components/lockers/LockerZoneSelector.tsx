'use client'

import { LOCKER_ZONES, zoneTotal } from '@/lib/lockers/data'
import type { LockerStatusEntry } from '@/types'
import { Sofa, BookOpen, ChevronRight } from 'lucide-react'

const ZONE_ICONS: Record<string, React.ReactNode> = {
  lobby: <Sofa className="w-5 h-5" />,
  reading: <BookOpen className="w-5 h-5" />,
}

interface LockerZoneSelectorProps {
  statuses: LockerStatusEntry[]
  selectedZoneId: string | null
  onSelectZone: (zoneId: string) => void
}

export default function LockerZoneSelector({ statuses, selectedZoneId, onSelectZone }: LockerZoneSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {LOCKER_ZONES.map((zone) => {
        const total = zoneTotal(zone)
        const takenKeys = new Set(
          statuses
            .filter((s) => s.zone_id === zone.id)
            .map((s) => `${s.block_id}::${s.locker_number}`)
        )
        const available = Math.max(0, total - takenKeys.size)
        const isSelected = selectedZoneId === zone.id

        return (
          <button
            key={zone.id}
            onClick={() => onSelectZone(zone.id)}
            className={`text-left bg-white rounded-lg border shadow-sm p-5 transition-colors ${
              isSelected ? 'border-[#003087] ring-2 ring-[#003087]/20' : 'border-gray-200 hover:border-[#003087]/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#003087]">
                {ZONE_ICONS[zone.id]}
                <span className="font-bold text-gray-900">{zone.label}</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{zone.description}</p>
            <p className="text-sm font-semibold mt-3">
              <span className={available > 0 ? 'text-green-700' : 'text-red-600'}>빈자리 {available}</span>
              <span className="text-gray-400"> / 총 {total}칸</span>
            </p>
          </button>
        )
      })}
    </div>
  )
}
