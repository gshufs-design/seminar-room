'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { blockNumbers, blockTotal, type LockerBlock } from '@/lib/lockers/data'
import type { LockerStatusEntry, LockerRequest } from '@/types'
import LockerRequestModal, { type LockerRequestTarget } from './LockerRequestModal'
import AdminLockerCellModal from './AdminLockerCellModal'

// 아티팩트에서 확정한 색상 그대로
const COLORS = {
  navy: '#1E2A5C',
  textMuted: '#8A7C60',
  lockerAvailable: '#A9CBA4',
  lockerAvailableText: '#25402A',
  lockerPending: '#EFD48F',
  lockerPendingText: '#8A6A1A',
  lockerOccupied: '#D8D2C2',
  lockerOccupiedText: '#9C9484',
  lockerClearing: '#F0BE8E',
  lockerClearingText: '#8A4E1A',
  gridBg: '#B7B2A0',
  gridBorder: '#8f8a78',
}

function statusOf(
  statuses: LockerStatusEntry[],
  zoneId: string,
  blockId: string,
  number: number
) {
  const entry = statuses.find(
    (s) => s.zone_id === zoneId && s.block_id === blockId && s.locker_number === number
  )
  return entry?.status ?? 'available'
}

// 지하철 혼잡도 스타일 색상: 사용률 기준 초록(여유)/노랑(보통)/빨강(혼잡) — 아티팩트와 동일한 hex 값
function congestionColor(unavailable: number, total: number) {
  const ratio = total ? unavailable / total : 0
  if (ratio >= 0.7) return { bg: '#E7A6A0', strong: '#B5433C', label: '혼잡' }
  if (ratio >= 0.35) return { bg: '#EFD48F', strong: '#8A6A1A', label: '보통' }
  return { bg: '#AFCDA9', strong: '#3D6B4C', label: '여유' }
}

interface LockerBlockTileProps {
  zoneId: string
  zoneLabel: string
  block: LockerBlock
  statuses: LockerStatusEntry[]
  onRefresh: () => void
  /** 관리자가 이름을 바꿨다면 그 표시용 라벨 (없으면 block.label 사용) */
  label?: string
  /** 편집 모드일 땐 클릭해도 칸 목록이 안 열리고 드래그만 됨 (위치를 옮기는 중이므로) */
  editMode?: boolean
  /**
   * 관리자 화면인지 여부. true면 칸을 눌렀을 때 "신청하기" 대신 신청자 정보(학과·이름·
   * 학번·연락처·이메일)와 승인/거절 버튼이 뜹니다. 이때는 requests(전체 신청 내역)가 필요합니다.
   */
  adminView?: boolean
  requests?: LockerRequest[]
  /** 학생 화면 전용: 지금 신청을 받고 있는지 (꺼져 있으면 빈 칸도 클릭 안 됨) */
  applicationsOpen?: boolean
}

export default function LockerBlockTile({
  zoneId,
  zoneLabel,
  block,
  statuses,
  onRefresh,
  label,
  editMode = false,
  adminView = false,
  requests = [],
  applicationsOpen = true,
}: LockerBlockTileProps) {
  const [expanded, setExpanded] = useState(false)
  const [requestTarget, setRequestTarget] = useState<LockerRequestTarget | null>(null)
  const [adminTarget, setAdminTarget] = useState<LockerRequest | null>(null)
  const displayLabel = label ?? block.label

  const total = blockTotal(block)
  const numbers = blockNumbers(block).filter((n): n is number => n != null)
  // 'clearing'(비우는 중)도 아직은 다른 사람이 못 쓰는 상태라 '사용중'으로 집계합니다.
  const unavailable = numbers.filter((n) => statusOf(statuses, zoneId, block.id, n) !== 'available').length
  const available = total - unavailable
  const cg = congestionColor(unavailable, total)

  const findRequest = (n: number) =>
    requests.find(
      (r) =>
        r.zone_id === zoneId &&
        r.block_id === block.id &&
        r.locker_number === n &&
        (r.status === 'pending' || r.status === 'approved')
    ) ?? null

  return (
    <>
      <button
        onClick={() => !editMode && setExpanded(true)}
        style={{
          width: '100%',
          height: '100%',
          background: cg.bg,
          border: `2px solid ${cg.strong}44`,
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: editMode ? 'inherit' : 'pointer',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => { if (!editMode) e.currentTarget.style.transform = 'scale(1.05)' }}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: cg.strong }}>{displayLabel}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: cg.strong, opacity: 0.85 }}>{cg.label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: cg.strong }}>
          {available} / {total}
        </span>
      </button>

      <Modal isOpen={expanded} onClose={() => setExpanded(false)} title={`${zoneLabel} · ${displayLabel}`} size="xl">
        <div style={{ overflowX: 'auto' }}>
          <div
            className="grid gap-[5px] p-2 rounded-lg"
            style={{ gridTemplateColumns: `repeat(${block.cols}, 66px)`, justifyContent: 'center', background: COLORS.gridBg, border: `2px solid ${COLORS.gridBorder}`, width: 'fit-content', margin: '0 auto' }}
          >
          {blockNumbers(block).map((n, i) => {
            if (n == null) return <div key={`empty-${i}`} style={{ aspectRatio: 0.9 }} />
            const status = statusOf(statuses, zoneId, block.id, n)
            const bg =
              status === 'approved' ? COLORS.lockerOccupied
              : status === 'clearing' ? COLORS.lockerClearing
              : status === 'pending' ? COLORS.lockerPending
              : COLORS.lockerAvailable
            const textColor =
              status === 'approved' ? COLORS.lockerOccupiedText
              : status === 'clearing' ? COLORS.lockerClearingText
              : status === 'pending' ? COLORS.lockerPendingText
              : COLORS.lockerAvailableText

            // 관리자 화면: 신청/승인/비우는중 칸만 클릭 가능(정보 확인용), 빈 칸은 볼 것이 없어 비활성.
            // 학생 화면: 신청 기간이 열려 있고, 빈 칸일 때만 클릭 가능.
            const clickable = adminView ? status !== 'available' : status === 'available' && applicationsOpen

            return (
              <button
                key={n}
                disabled={!clickable}
                onClick={() => {
                  if (adminView) {
                    const req = findRequest(n)
                    if (req) setAdminTarget(req)
                  } else {
                    setRequestTarget({ zoneId, blockId: block.id, blockLabel: displayLabel, number: n })
                  }
                }}
                style={{ aspectRatio: 0.9, background: bg, cursor: clickable ? 'pointer' : 'not-allowed' }}
                className="rounded-[10px] flex flex-col items-center justify-center relative transition-transform hover:enabled:-translate-y-0.5"
                title={
                  status === 'pending'
                    ? `${n} · 승인 대기중${adminView ? ' (눌러서 신청자 정보 보기)' : ''}`
                    : status === 'clearing'
                    ? `${n} · 비우는 중${adminView ? ' (눌러서 신청자 정보 보기)' : ''}`
                    : status === 'approved'
                    ? `${n} · 예약됨${adminView ? ' (눌러서 신청자 정보 보기)' : ''}`
                    : applicationsOpen || adminView
                    ? `${n} · 신청 가능`
                    : `${n} · 지금은 신청 기간이 아닙니다`
                }
              >
                {/* 로커 손잡이 느낌의 작은 바 */}
                <span className="absolute top-[5px] w-3 h-[3px] rounded-full bg-black/15" />
                <span className="text-[11px] font-bold mt-2" style={{ color: textColor }}>
                  {n}
                </span>
              </button>
            )
          })}
          </div>
        </div>
        <div className="flex items-center gap-3.5 mt-2.5 text-xs flex-wrap" style={{ color: COLORS.textMuted }}>
          <LegendDot color={COLORS.lockerAvailable} label="신청 가능" />
          <LegendDot color={COLORS.lockerPending} label="승인 대기중" />
          <LegendDot color={COLORS.lockerClearing} label="비우는 중" />
          <LegendDot color={COLORS.lockerOccupied} label="예약 완료" />
        </div>
        {adminView && (
          <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>
            💡 대기중·예약 완료 칸을 누르면 신청자 정보를 볼 수 있습니다.
          </p>
        )}
      </Modal>

      {!adminView && (
        <LockerRequestModal
          target={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSuccess={() => {
            onRefresh()
            setRequestTarget(null)
            setExpanded(false)
          }}
        />
      )}

      {adminView && (
        <AdminLockerCellModal
          request={adminTarget}
          onClose={() => setAdminTarget(null)}
          onChanged={onRefresh}
        />
      )}
    </>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
      {label}
    </span>
  )
}
