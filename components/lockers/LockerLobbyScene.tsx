'use client'

import { LOCKER_ZONES } from '@/lib/lockers/data'
import type { LockerStatusEntry, LockerRequest } from '@/types'
import LockerBlockTile from './LockerBlockTile'
import MapViewport from './MapViewport'
import EditableBox, { type BoxState } from './EditableBox'
import { useEditableLayout } from '@/lib/lockers/useEditableLayout'

// 820x560 고정 도면 (실제 영상 속 로비 배치를 그대로 반영)
const CANVAS_W = 820
const CANVAS_H = 560

const COLORS = {
  lobbyWall: '#FAF5F6',
  lobbyPillar: '#F0E3E5',
  tableWood: '#B98A55',
  yellow: '#F5CB3E',
  floorFleck: 'rgba(179, 155, 108, 0.16)',
  roomBorder: '#E7D6AC',
  navy: '#1E2A5C',
  roomLabel: '#7A6A4C',
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const DECOR: { id: string; label: string; kind: 'tv' | 'table' | 'window-table' | 'tactile' | 'pillar' | 'cooler'; box: Box }[] = [
  { id: 'tv', label: 'TV', kind: 'tv', box: { x: 27, y: 151, w: 72, h: 121 } },
  { id: 'table1', label: '🪑 테이블', kind: 'table', box: { x: 25, y: 300, w: 150, h: 64 } },
  { id: 'table2', label: '🪑 테이블', kind: 'table', box: { x: 23, y: 410, w: 150, h: 64 } },
  { id: 'wtable1', label: '창가 테이블', kind: 'window-table', box: { x: 318, y: 24, w: 70, h: 90 } },
  { id: 'wtable2', label: '창가 테이블', kind: 'window-table', box: { x: 463, y: 25, w: 70, h: 90 } },
  { id: 'wtable3', label: '창가 테이블', kind: 'window-table', box: { x: 600, y: 25, w: 70, h: 90 } },
  { id: 'tactile', label: '계단', kind: 'tactile', box: { x: 266, y: 498, w: 146, h: 32 } },
  { id: 'pillar', label: '벽', kind: 'pillar', box: { x: 757, y: -2, w: 56, h: CANVAS_H } },
  { id: 'watercooler', label: '정수기', kind: 'cooler', box: { x: 686, y: 417, w: 62, h: 73 } },
]

const LOCKER_BOX_LEFT: Box = { x: 660, y: 160, w: 90, h: 120 }
const LOCKER_BOX_RIGHT: Box = { x: 660, y: 290, w: 90, h: 120 }

interface LockerLobbySceneProps {
  statuses: LockerStatusEntry[]
  onRefresh: () => void
  isAdmin: boolean
  adminView?: boolean
  requests?: LockerRequest[]
  applicationsOpen?: boolean
}

export default function LockerLobbyScene({ statuses, onRefresh, isAdmin, adminView = false, requests = [], applicationsOpen = true }: LockerLobbySceneProps) {
  const { overrides, ready, editMode, setEditMode, updateOverride, resetLayout } = useEditableLayout('lobby', isAdmin)
  const zone = LOCKER_ZONES.find((z) => z.id === 'lobby')
  if (!zone) return null

  const editLabel = (id: string, box: BoxState, base: { x: number; y: number; w: number; h: number; label?: string }) => {
    const next = window.prompt('이름 수정', box.label)
    if (next != null && next.trim()) updateOverride(id, { label: next.trim() }, base)
  }

  const editLockerNumbers = (id: string, blockDefault: { rangeStart: number; rangeEnd: number; cols: number }, base: { x: number; y: number; w: number; h: number; label?: string }) => {
    const ov = overrides[id]
    const curStart = ov?.rangeStart ?? blockDefault.rangeStart
    const curEnd = ov?.rangeEnd ?? blockDefault.rangeEnd
    const curCols = ov?.cols ?? blockDefault.cols
    const rangeInput = window.prompt('사물함 번호 범위 (예: 37-48)', `${curStart}-${curEnd}`)
    if (!rangeInput) return
    const m = rangeInput.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/)
    if (!m) { window.alert('숫자-숫자 형식으로 입력해 주시기 바랍니다 (예: 37-48)'); return }
    const rangeStart = parseInt(m[1], 10)
    const rangeEnd = parseInt(m[2], 10)
    if (rangeEnd < rangeStart) { window.alert('끝 번호가 시작 번호보다 커야 합니다.'); return }
    const colsInput = window.prompt('한 줄에 몇 칸?', String(curCols))
    const cols = colsInput ? Math.max(1, parseInt(colsInput, 10) || curCols) : curCols
    updateOverride(id, { rangeStart, rangeEnd, cols, label: `${rangeStart}~${rangeEnd}` }, { ...base, rangeStart: blockDefault.rangeStart, rangeEnd: blockDefault.rangeEnd, cols: blockDefault.cols })
  }

  if (!ready) {
    return (
      <div style={{ height: 520, borderRadius: 18, background: COLORS.lobbyWall, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7C60', fontSize: 13 }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
          {editMode && (
            <button
              onClick={() => { if (window.confirm('로비 배치를 기본값으로 되돌리시겠습니까?')) resetLayout() }}
              style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: `2px solid ${COLORS.roomBorder}`, background: '#fff', color: COLORS.roomLabel, cursor: 'pointer' }}
            >
              초기화
            </button>
          )}
          <button
            onClick={() => setEditMode((v) => !v)}
            style={{
              fontSize: 12, fontWeight: 800, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
              border: `2px solid ${editMode ? COLORS.navy : COLORS.roomBorder}`,
              background: editMode ? COLORS.navy : '#fff', color: editMode ? '#fff' : '#3B3324',
            }}
          >
            {editMode ? '✓ 완료' : '✏️ 편집'}
          </button>
        </div>
      )}

      <MapViewport width={CANVAS_W} height={CANVAS_H} background={COLORS.lobbyWall}>
        {(scale) => (
          <>
            <div
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `radial-gradient(${COLORS.floorFleck} 1px, transparent 1px)`,
                backgroundSize: '14px 14px',
              }}
            />

            {DECOR.map((d) => (
              <EditableBox key={d.id} id={d.id} base={{ ...d.box, label: d.label }} override={overrides[d.id]} scale={scale} editMode={editMode}
                onChange={(id, patch) => updateOverride(id, patch, { ...d.box, label: d.label })}
                onEdit={(id, box) => editLabel(id, box, { ...d.box, label: d.label })}>
                {(box) => <DecorContent kind={d.kind} label={box.label} />}
              </EditableBox>
            ))}

            {/* 사물함 왼쪽 (37~48) */}
            {zone.blocks[0] && (
              <EditableBox id="lockers-left" base={{ ...LOCKER_BOX_LEFT, label: zone.blocks[0].label }} override={overrides['lockers-left']} scale={scale} editMode={editMode}
                onChange={(id, patch) => updateOverride(id, patch, { ...LOCKER_BOX_LEFT, label: zone.blocks[0].label })}
                onEdit={(id) => editLockerNumbers(id, zone.blocks[0], { ...LOCKER_BOX_LEFT, label: zone.blocks[0].label })}>
                {(box) => {
                  const ov = overrides['lockers-left']
                  const effectiveBlock = { ...zone.blocks[0], rangeStart: ov?.rangeStart ?? zone.blocks[0].rangeStart, rangeEnd: ov?.rangeEnd ?? zone.blocks[0].rangeEnd, cols: ov?.cols ?? zone.blocks[0].cols }
                  return (
                    <LockerBlockTile zoneId="lobby" zoneLabel={zone.label} block={effectiveBlock} statuses={statuses} onRefresh={onRefresh} label={box.label} editMode={editMode} adminView={adminView} requests={requests} applicationsOpen={applicationsOpen} />
                  )
                }}
              </EditableBox>
            )}

            {/* 사물함 오른쪽 (49~60) */}
            {zone.blocks[1] && (
              <EditableBox id="lockers-right" base={{ ...LOCKER_BOX_RIGHT, label: zone.blocks[1].label }} override={overrides['lockers-right']} scale={scale} editMode={editMode}
                onChange={(id, patch) => updateOverride(id, patch, { ...LOCKER_BOX_RIGHT, label: zone.blocks[1].label })}
                onEdit={(id) => editLockerNumbers(id, zone.blocks[1], { ...LOCKER_BOX_RIGHT, label: zone.blocks[1].label })}>
                {(box) => {
                  const ov = overrides['lockers-right']
                  const effectiveBlock = { ...zone.blocks[1], rangeStart: ov?.rangeStart ?? zone.blocks[1].rangeStart, rangeEnd: ov?.rangeEnd ?? zone.blocks[1].rangeEnd, cols: ov?.cols ?? zone.blocks[1].cols }
                  return (
                    <LockerBlockTile zoneId="lobby" zoneLabel={zone.label} block={effectiveBlock} statuses={statuses} onRefresh={onRefresh} label={box.label} editMode={editMode} adminView={adminView} requests={requests} applicationsOpen={applicationsOpen} />
                  )
                }}
              </EditableBox>
            )}
          </>
        )}
      </MapViewport>
    </div>
  )
}

const chipStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  color: '#1F2937',
  fontWeight: 800,
  borderRadius: 5,
  padding: '2px 6px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
}

function DecorContent({ kind, label }: { kind: string; label: string }) {
  if (kind === 'tv') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#2B2B2E', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...chipStyle, fontSize: 11 }}>📺 {label}</span>
      </div>
    )
  }
  if (kind === 'table') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#B98A55', border: '2px solid #9C7040', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...chipStyle, fontSize: 11 }}>{label}</span>
      </div>
    )
  }
  if (kind === 'window-table') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#B98A55', border: '2px solid #9C7040', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 16 }}>🪟</span>
        <span style={{ ...chipStyle, fontSize: 10 }}>{label}</span>
      </div>
    )
  }
  if (kind === 'tactile') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#F5CB3E', borderRadius: 4, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...chipStyle, fontSize: 11 }}>{label}</span>
      </div>
    )
  }
  if (kind === 'pillar') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#F0E3E5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10 }}>
        <span style={{ ...chipStyle, fontSize: 10, writingMode: 'vertical-rl' as const }}>{label}</span>
      </div>
    )
  }
  // cooler
  return (
    <div style={{ width: '100%', height: '100%', background: '#F3F0E8', border: '2px solid #D8D2C2', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <span style={{ fontSize: 16 }}>🚰</span>
      <span style={{ ...chipStyle, fontSize: 9 }}>{label}</span>
    </div>
  )
}
