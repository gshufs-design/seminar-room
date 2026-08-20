'use client'

import { LOCKER_ZONES, zoneTotal } from '@/lib/lockers/data'
import type { LockerStatusEntry } from '@/types'
import MapViewport from './MapViewport'
import EditableBox, { type BoxState } from './EditableBox'
import { useEditableLayout } from '@/lib/lockers/useEditableLayout'

// 900x615 고정 도면 — 로비(820x560)·열람실 앞(820x560)과 같은 가로세로 비율(약 1.46:1)로 맞췄습니다.
// 기존 요소 좌표(900x480 기준)는 그대로 두고 y좌표만 +88 만큼 내려서, 늘어난 세로 공간에서
// 위아래 여백이 비슷하게 보이도록 가운데 정렬했습니다.
const CANVAS_W = 900
const CANVAS_H = 615

const COLORS = {
  bg: '#FBF6EA',
  floorFleck: 'rgba(179, 155, 108, 0.16)',
  corridor: '#F3EAD3',
  room: '#FFFFFF',
  roomBorder: '#E7D6AC',
  roomLabel: '#3B3324',
  navy: '#1E2A5C',
  yellow: '#F5CB3E',
  lobby: '#E38FA0',
  lobbySoft: 'rgba(227, 143, 160, 0.22)',
  reading: '#6FA37E',
  readingSoft: 'rgba(111, 163, 126, 0.22)',
  textMuted: '#5C4A32',
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const ROOMS: (Box & { id: string; label: string })[] = [
  { id: 'readingroom', label: '열람실', x: 50, y: 96, w: 189, h: 199 },
  { id: 'council', label: '총학생회실', x: 253, y: 299, w: 123, h: 67 },
]

const SERVICES: (Box & { id: string; label: string; emoji: string })[] = [
  { id: 'stairs', label: '계단', emoji: '🪜', x: 659, y: 458, w: 148, h: 61 },
  { id: 'wc', label: '화장실', emoji: '🚻', x: 818, y: 368, w: 78, h: 78 },
]

const CORRIDORS: (Box & { id: string })[] = [
  { id: 'c-upper', x: 251, y: 236, w: 317, h: 56 },
  { id: 'c-lower', x: 442, y: 259, w: 92, h: 24 },
]

const ZONE_META: { id: string; emoji: string; x: number; y: number; w: number; h: number; accent: string; soft: string }[] = [
  { id: 'reading', emoji: '📚', x: 251, y: 95, w: 150, h: 130, accent: COLORS.reading, soft: COLORS.readingSoft },
  { id: 'lobby', emoji: '🛋️', x: 576, y: 206, w: 234, h: 244, accent: COLORS.lobby, soft: COLORS.lobbySoft },
]

interface LockerFloorMapProps {
  statuses: LockerStatusEntry[]
  onSelectZone: (zoneId: string) => void
  isAdmin: boolean
}

export default function LockerFloorMap({ statuses, onSelectZone, isAdmin }: LockerFloorMapProps) {
  const { overrides, ready, editMode, setEditMode, updateOverride, resetLayout } = useEditableLayout('map', isAdmin)

  const editLabel = (id: string, box: BoxState, base: { x: number; y: number; w: number; h: number; label?: string }) => {
    const next = window.prompt('이름 수정', box.label)
    if (next != null && next.trim()) updateOverride(id, { label: next.trim() }, base)
  }

  const availableCount = (zoneId: string) => {
    const zone = LOCKER_ZONES.find((z) => z.id === zoneId)
    if (!zone) return 0
    const total = zoneTotal(zone)
    const taken = new Set(
      statuses.filter((s) => s.zone_id === zoneId).map((s) => `${s.block_id}::${s.locker_number}`)
    )
    return Math.max(0, total - taken.size)
  }

  // 저장된 배치를 다 불러오기 전까지는 기본값이 잠깐 보였다 바뀌는 깜빡임을 막기 위해 아무것도 그리지 않습니다.
  if (!ready) {
    return (
      <div style={{ height: 520, borderRadius: 18, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 13 }}>
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
              onClick={() => { if (window.confirm('이 도면의 배치를 기본값으로 되돌리시겠습니까?')) resetLayout() }}
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

      <MapViewport width={CANVAS_W} height={CANVAS_H} background={COLORS.bg}>
        {(scale) => (
          <>
            <div
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `radial-gradient(${COLORS.floorFleck} 1px, transparent 1px)`,
                backgroundSize: '14px 14px',
              }}
            />

            {/* 복도 */}
            {CORRIDORS.map((c) => (
              <EditableBox key={c.id} id={c.id} base={c} override={overrides[c.id]} scale={scale} editMode={editMode}
                onChange={(id, patch) => updateOverride(id, patch, c)}>
                {() => <div style={{ width: '100%', height: '100%', background: COLORS.corridor, borderRadius: 14 }} />}
              </EditableBox>
            ))}

            {/* 맥락용 방 (열람실 · 총학생회실) */}
            {ROOMS.map((r) => (
              <EditableBox key={r.id} id={r.id} base={r} override={overrides[r.id]} scale={scale} editMode={editMode}
                onChange={(id, patch) => updateOverride(id, patch, r)}
                onEdit={(id, box) => editLabel(id, box, r)}>
                {(box) => (
                  <div style={{
                    width: '100%', height: '100%', background: COLORS.room, border: `2px solid ${COLORS.roomBorder}`,
                    borderRadius: 12, boxShadow: '0 4px 0 -1px rgba(180,150,90,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 6px',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.roomLabel }}>{box.label}</span>
                  </div>
                )}
              </EditableBox>
            ))}

            {/* 계단 · 화장실 */}
            {SERVICES.map((s) => (
              <EditableBox key={s.id} id={s.id} base={s} override={overrides[s.id]} scale={scale} editMode={editMode}
                onChange={(id, patch) => updateOverride(id, patch, s)}
                onEdit={(id, box) => editLabel(id, box, s)}>
                {(box) => (
                  <div style={{
                    width: '100%', height: '100%', background: '#FDF9EF', border: `2px solid ${COLORS.roomBorder}`,
                    borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 22 }}>{s.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#2D2417', background: 'rgba(255,255,255,0.95)', borderRadius: 5, padding: '2px 7px', border: '1px solid rgba(0,0,0,0.06)' }}>{box.label}</span>
                  </div>
                )}
              </EditableBox>
            ))}

            {/* 사물함 구역 (로비 / 열람실 앞) */}
            {ZONE_META.map((z) => {
              const zone = LOCKER_ZONES.find((zz) => zz.id === z.id)
              if (!zone) return null
              return (
                <EditableBox key={z.id} id={z.id} base={{ ...z, label: zone.label }} override={overrides[z.id]} scale={scale} editMode={editMode}
                  onChange={(id, patch) => updateOverride(id, patch, { ...z, label: zone.label })}
                  onEdit={(id, box) => editLabel(id, box, { ...z, label: zone.label })}
                  onClick={() => onSelectZone(z.id)}>
                  {(box) => (
                    <div
                      style={{
                        width: '100%', height: '100%', background: 'rgba(255,255,255,0.72)', border: '2.5px solid transparent',
                        borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', cursor: editMode ? 'inherit' : 'pointer', boxShadow: '0 8px 14px -10px rgba(60,40,20,0.25)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (editMode) return
                        e.currentTarget.style.background = z.soft
                        e.currentTarget.style.borderColor = z.accent
                        e.currentTarget.style.boxShadow = `0 14px 24px -12px rgba(60,40,20,0.35), 0 0 0 2px ${z.accent}66`
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.72)'
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.boxShadow = '0 8px 14px -10px rgba(60,40,20,0.25)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <div style={{ fontSize: 26 }}>{z.emoji}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1F2937', marginTop: 2 }}>{box.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginTop: 1 }}>
                        {zone.id === 'lobby' ? 'A구역' : 'B구역'} · {zone.description}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: COLORS.navy, background: COLORS.yellow, borderRadius: 999, padding: '3px 10px' }}>
                        빈자리 {availableCount(z.id)}개
                      </div>
                    </div>
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
