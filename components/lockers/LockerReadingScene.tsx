'use client'

import { LOCKER_ZONES, type LockerBlock } from '@/lib/lockers/data'
import type { LockerStatusEntry, LockerRequest } from '@/types'
import LockerBlockTile from './LockerBlockTile'
import MapViewport from './MapViewport'
import EditableBox, { type BoxState } from './EditableBox'
import { useEditableLayout } from '@/lib/lockers/useEditableLayout'

// 820x560 고정 도면 (직접 그려주신 손그림 도면 그대로)
const CANVAS_W = 820
const CANVAS_H = 560

const COLORS = {
  readingScene: '#F7FAF6',
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

const DECOR: { id: string; label: string; kind: 'window' | 'door'; box: Box }[] = [
  { id: 'window', label: '🪟 창문', kind: 'window', box: { x: 300, y: 6, w: 500, h: 24 } },
  { id: 'door-left', label: '열람실 입구', kind: 'door', box: { x: 20, y: 184, w: 119, h: 76 } },
  { id: 'door-bottom', label: '총학생회실', kind: 'door', box: { x: 581, y: 512, w: 130, h: 44 } },
]

const BLOCK_BOX: Record<string, Box> = {
  'reading-d': { x: 20, y: 10, w: 121, h: 158 },
  'reading-g': { x: 18, y: 280, w: 118, h: 98 },
  'reading-e': { x: 18, y: 397, w: 117, h: 158 },
  'reading-f': { x: 189, y: 464, w: 123, h: 91 },
  'reading-c': { x: 679, y: 42, w: 124, h: 198 },
  'reading-b': { x: 679, y: 251, w: 123, h: 196 },
}

interface LockerReadingSceneProps {
  statuses: LockerStatusEntry[]
  onRefresh: () => void
  isAdmin: boolean
  adminView?: boolean
  requests?: LockerRequest[]
  applicationsOpen?: boolean
}

export default function LockerReadingScene({ statuses, onRefresh, isAdmin, adminView = false, requests = [], applicationsOpen = true }: LockerReadingSceneProps) {
  const { overrides, ready, editMode, setEditMode, updateOverride, resetLayout } = useEditableLayout('reading', isAdmin)
  const zone = LOCKER_ZONES.find((z) => z.id === 'reading')
  if (!zone) return null

  const editLabel = (id: string, box: BoxState, base: { x: number; y: number; w: number; h: number; label?: string }) => {
    const next = window.prompt('이름 수정', box.label)
    if (next != null && next.trim()) updateOverride(id, { label: next.trim() }, base)
  }

  const editLockerNumbers = (id: string, blockDefault: LockerBlock, base: { x: number; y: number; w: number; h: number; label?: string }) => {
    const ov = overrides[id]
    const curStart = ov?.rangeStart ?? blockDefault.rangeStart
    const curEnd = ov?.rangeEnd ?? blockDefault.rangeEnd
    const rangeInput = window.prompt('사물함 번호 범위 (예: 141-170)', `${curStart}-${curEnd}`)
    if (!rangeInput) return
    const m = rangeInput.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/)
    if (!m) { window.alert('숫자-숫자 형식으로 입력해 주시기 바랍니다 (예: 141-170)'); return }
    const rangeStart = parseInt(m[1], 10)
    const rangeEnd = parseInt(m[2], 10)
    if (rangeEnd < rangeStart) { window.alert('끝 번호가 시작 번호보다 커야 합니다.'); return }
    // 세로 5칸 고정 규칙(왼쪽 열부터 위→아래)이라, 열 개수는 번호 범위에 맞춰 자동 계산합니다.
    const total = rangeEnd - rangeStart + 1
    const rows = blockDefault.rows ?? 5
    const cols = Math.ceil(total / rows)
    updateOverride(id, { rangeStart, rangeEnd, cols, label: `${rangeStart}~${rangeEnd}` }, { ...base, rangeStart: blockDefault.rangeStart, rangeEnd: blockDefault.rangeEnd, cols: blockDefault.cols })
  }

  if (!ready) {
    return (
      <div style={{ height: 520, borderRadius: 18, background: COLORS.readingScene, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7C60', fontSize: 13 }}>
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
              onClick={() => { if (window.confirm('열람실 앞 배치를 기본값으로 되돌리시겠습니까?')) resetLayout() }}
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

      <MapViewport width={CANVAS_W} height={CANVAS_H} background={COLORS.readingScene}>
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
                {(box) => (
                  <div
                    style={{
                      width: '100%', height: '100%',
                      background: d.kind === 'window' ? '#CFE3D6' : '#D8CBB2',
                      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 4px',
                    }}
                  >
                    <span style={{ background: 'rgba(255,255,255,0.92)', color: '#1F2937', fontWeight: 800, borderRadius: 5, padding: '2px 6px', fontSize: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                      {box.label}
                    </span>
                  </div>
                )}
              </EditableBox>
            ))}

            {/* 사물함 캐비닛 D · G · E · F · C · B */}
            {zone.blocks.map((block: LockerBlock) => {
              const base = { ...BLOCK_BOX[block.id], label: block.label }
              const ov = overrides[block.id]
              const effectiveBlock = { ...block, rangeStart: ov?.rangeStart ?? block.rangeStart, rangeEnd: ov?.rangeEnd ?? block.rangeEnd, cols: ov?.cols ?? block.cols }
              return (
                <EditableBox key={block.id} id={block.id} base={base} override={overrides[block.id]} scale={scale} editMode={editMode}
                  onChange={(id, patch) => updateOverride(id, patch, base)}
                  onEdit={(id) => editLockerNumbers(id, block, base)}>
                  {(box) => (
                    <LockerBlockTile
                      zoneId="reading"
                      zoneLabel={zone.label}
                      block={effectiveBlock}
                      statuses={statuses}
                      onRefresh={onRefresh}
                      label={box.label}
                      editMode={editMode}
                      adminView={adminView}
                      requests={requests}
                      applicationsOpen={applicationsOpen}
                    />
                  )}
                </EditableBox>
              )
            })}
          </>
        )}
      </MapViewport>
    </div>
  )
}
