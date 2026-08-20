'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { getZone, blockNumbers, blockTotal } from '@/lib/lockers/data'
import type { LockerStatusEntry, LockerRequestStatus } from '@/types'
import LockerRequestModal, { type LockerRequestTarget } from './LockerRequestModal'
import { Lock, Clock } from 'lucide-react'

interface LockerBlockGridProps {
  zoneId: string
  statuses: LockerStatusEntry[]
  onRefresh: () => void
}

function statusOf(
  statuses: LockerStatusEntry[],
  zoneId: string,
  blockId: string,
  number: number
): LockerRequestStatus | 'available' {
  const entry = statuses.find(
    (s) => s.zone_id === zoneId && s.block_id === blockId && s.locker_number === number
  )
  return entry?.status ?? 'available'
}

function congestionStyle(unavailable: number, total: number) {
  const ratio = total ? unavailable / total : 0
  if (ratio >= 0.7) return { box: 'bg-red-50 border-red-300', text: 'text-red-700', label: '혼잡' }
  if (ratio >= 0.35) return { box: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', label: '보통' }
  return { box: 'bg-green-50 border-green-300', text: 'text-green-700', label: '여유' }
}

export default function LockerBlockGrid({ zoneId, statuses, onRefresh }: LockerBlockGridProps) {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)
  const [requestTarget, setRequestTarget] = useState<LockerRequestTarget | null>(null)

  const zone = getZone(zoneId)
  if (!zone) return null

  const expandedBlock = zone.blocks.find((b) => b.id === expandedBlockId) ?? null

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {zone.blocks.map((block) => {
          const total = blockTotal(block)
          const numbers = blockNumbers(block).filter((n): n is number => n != null)
          const unavailable = numbers.filter((n) => statusOf(statuses, zoneId, block.id, n) !== 'available').length
          const available = total - unavailable
          const style = congestionStyle(unavailable, total)

          return (
            <button
              key={block.id}
              onClick={() => setExpandedBlockId(block.id)}
              className={`rounded-lg border p-4 text-center transition-transform hover:scale-[1.02] ${style.box}`}
            >
              <p className="text-sm font-bold text-gray-900">{block.label}</p>
              <p className={`text-xs font-semibold mt-0.5 ${style.text}`}>{style.label}</p>
              <p className={`text-lg font-bold mt-1 ${style.text}`}>
                {available} <span className="text-sm font-normal text-gray-400">/ {total}</span>
              </p>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />
          신청 가능
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />
          승인 대기중
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
          예약 완료
        </span>
      </div>

      <Modal
        isOpen={!!expandedBlock}
        onClose={() => setExpandedBlockId(null)}
        title={expandedBlock ? `${zone.label} · ${expandedBlock.label}` : ''}
        size="md"
      >
        {expandedBlock && (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${expandedBlock.cols}, minmax(0, 1fr))` }}
          >
            {blockNumbers(expandedBlock).map((n, i) => {
              if (n == null) return <div key={`empty-${i}`} className="aspect-square" />
              const status = statusOf(statuses, zoneId, expandedBlock.id, n)
              const cellClass =
                status === 'approved'
                  ? 'bg-blue-100 text-blue-900 cursor-not-allowed'
                  : status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'

              return (
                <button
                  key={n}
                  disabled={status !== 'available'}
                  onClick={() =>
                    setRequestTarget({ zoneId, blockId: expandedBlock.id, blockLabel: expandedBlock.label, number: n })
                  }
                  className={`aspect-square rounded flex flex-col items-center justify-center text-[11px] font-semibold transition-colors ${cellClass}`}
                  title={
                    status === 'pending' ? `${n} · 승인 대기중` : status === 'approved' ? `${n} · 예약됨` : `${n} · 신청 가능`
                  }
                >
                  {status === 'approved' && <Lock className="w-3 h-3 mb-0.5" />}
                  {status === 'pending' && <Clock className="w-3 h-3 mb-0.5" />}
                  {n}
                </button>
              )
            })}
          </div>
        )}
      </Modal>

      <LockerRequestModal
        target={requestTarget}
        onClose={() => setRequestTarget(null)}
        onSuccess={() => {
          onRefresh()
          setRequestTarget(null)
        }}
      />
    </>
  )
}
