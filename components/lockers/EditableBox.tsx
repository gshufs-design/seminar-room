'use client'

import { useEffect, useRef } from 'react'

const GRID = 10 // 자석처럼 착 붙는 간격(px, 도면 좌표 기준)
const snap = (v: number) => Math.round(v / GRID) * GRID

export interface BoxState {
  x: number
  y: number
  w: number
  h: number
  label: string
}

interface EditableBoxProps {
  id: string
  base: { x: number; y: number; w: number; h: number; label?: string }
  override?: { x: number; y: number; w: number; h: number; label?: string }
  scale: number
  editMode: boolean
  onChange: (id: string, patch: { x?: number; y?: number; w?: number; h?: number }) => void
  onEdit?: (id: string, box: BoxState) => void
  onClick?: () => void
  children: (box: BoxState) => React.ReactNode
}

/**
 * 도면 위의 박스 하나(방/구역/장식/사물함 블록 등)를 감싸서,
 * 편집 모드일 때 드래그로 옮기고 모서리로 크기 조절하고 (자석처럼 격자에 착 붙어서 정렬됨)
 * ✏️ 버튼으로 세부 내용을 수정할 수 있게 해줍니다.
 * 실제 위치는 base(기본값)에 override(관리자가 저장해둔 값)를 덮어써서 계산합니다.
 */
export default function EditableBox({
  id,
  base,
  override,
  scale,
  editMode,
  onChange,
  onEdit,
  onClick,
  children,
}: EditableBoxProps) {
  const box: BoxState = {
    x: override?.x ?? base.x,
    y: override?.y ?? base.y,
    w: override?.w ?? base.w,
    h: override?.h ?? base.h,
    label: override?.label ?? base.label ?? '',
  }

  const dragRef = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
  } | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (e.clientX - d.startX) / scale
      const dy = (e.clientY - d.startY) / scale
      if (d.mode === 'move') {
        onChange(id, { x: snap(d.origX + dx), y: snap(d.origY + dy) })
      } else {
        onChange(id, { w: Math.max(30, snap(d.origW + dx)), h: Math.max(24, snap(d.origH + dy)) })
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, id])

  const startDrag = (e: React.MouseEvent, mode: 'move' | 'resize') => {
    // 박스 위에서 누른 건 지도 전체를 이동(pan)시키면 안 되므로 항상 여기서 막습니다.
    e.stopPropagation()
    if (!editMode) return
    e.preventDefault()
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, origX: box.x, origY: box.y, origW: box.w, origH: box.h }
  }

  return (
    <div
      onMouseDown={(e) => startDrag(e, 'move')}
      onClick={() => {
        if (!editMode) onClick?.()
      }}
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        outline: editMode ? '2px dashed #4C6FD6' : 'none',
        outlineOffset: 2,
        cursor: editMode ? 'grab' : undefined,
      }}
    >
      {children(box)}

      {editMode && (
        <>
          <div
            onMouseDown={(e) => startDrag(e, 'resize')}
            title="크기 조절"
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 14,
              height: 14,
              borderRadius: 4,
              background: '#4C6FD6',
              border: '2px solid #fff',
              cursor: 'nwse-resize',
              zIndex: 5,
            }}
          />
          {onEdit && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onEdit(id, box)
              }}
              title="수정"
              style={{
                position: 'absolute',
                top: -11,
                left: -11,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: '#fff',
                border: '2px solid #4C6FD6',
                fontSize: 11,
                lineHeight: 1,
                cursor: 'pointer',
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              ✏️
            </button>
          )}
        </>
      )}
    </div>
  )
}
