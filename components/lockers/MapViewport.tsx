'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Minus, Maximize2 } from 'lucide-react'

interface MapViewportProps {
  width: number
  height: number
  background?: string
  children: (scale: number) => React.ReactNode
}

const MIN_SCALE = 0.4
const MAX_SCALE = 3

/**
 * width x height 고정 크기 도면을, 지도 보듯이 마우스 휠로 확대/축소하고
 * 빈 공간을 드래그해서 이동할 수 있게 하는 뷰포트입니다.
 * (도면 위 박스 자체를 드래그하는 편집 모드와는 별개 — 박스 위에서 누르면
 *  박스쪽 드래그가 우선되고, 빈 배경을 누를 때만 지도가 움직입니다.)
 */
export default function MapViewport({ width, height, background, children }: MapViewportProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)
  const [scale, setScale] = useState(1)
  // 처음 화면에 맞췄을 때의 높이를 그대로 프레임 높이로 씁니다 — 고정된 높이를 쓰면
  // 도면 가로세로 비율에 따라 아래쪽이 잘리는 문제가 있었습니다.
  const [frameHeight, setFrameHeight] = useState(height)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)

  // 네이티브 리스너(터치)에서 최신 scale/pan 값을 참조하기 위한 ref
  const scaleRef = useRef(scale)
  useEffect(() => { scaleRef.current = scale }, [scale])
  const panStateRef = useRef(pan)
  useEffect(() => { panStateRef.current = pan }, [pan])

  const fitToView = useCallback(() => {
    const el = outerRef.current
    if (!el) return
    const w = el.clientWidth
    const s = w > 0 ? Math.min(1.6, w / width) * 0.765 : 1
    setFitScale(s)
    setScale(s)
    // 스케일된 도면 높이보다 프레임을 살짝 더 크게 잡아서, 좌우 여백처럼 위아래에도
    // 옅은 여백이 보이게 합니다 (안쪽 콘텐츠는 top:50%/translate(-50%)로 중앙 정렬되어 있어
    // 프레임만 키우면 자동으로 위아래에 균등하게 여백이 생깁니다).
    setFrameHeight(height * s + 32)
    setPan({ x: 0, y: 0 })
  }, [width, height])

  useEffect(() => {
    fitToView()
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(fitToView)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

  const zoomBy = (factor: number) => setScale((s) => clampScale(s * factor))

  // React의 onWheel(합성 이벤트)은 브라우저가 passive 리스너로 취급해서
  // preventDefault가 씹히는 경우가 있어, 진짜 addEventListener로 직접 막습니다.
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setScale((s) => clampScale(s * factor))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 모바일 터치: 손가락 한 개면 이동(pan), 두 개면 핀치로 확대/축소.
  type TouchGesture =
    | { mode: 'pan'; startX: number; startY: number; origX: number; origY: number }
    | { mode: 'pinch'; startDist: number; startScale: number }
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const dist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    let gesture: TouchGesture | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        gesture = { mode: 'pinch', startDist: dist(e.touches), startScale: scaleRef.current }
      } else if (e.touches.length === 1) {
        const t = e.touches[0]
        gesture = { mode: 'pan', startX: t.clientX, startY: t.clientY, origX: panStateRef.current.x, origY: panStateRef.current.y }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!gesture) return
      e.preventDefault()
      if (gesture.mode === 'pinch' && e.touches.length === 2) {
        const factor = dist(e.touches) / gesture.startDist
        setScale(clampScale(gesture.startScale * factor))
      } else if (gesture.mode === 'pan' && e.touches.length === 1) {
        const t = e.touches[0]
        setPan({ x: gesture.origX + (t.clientX - gesture.startX), y: gesture.origY + (t.clientY - gesture.startY) })
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // 핀치(2손가락)에서 손가락 하나를 뗀 경우, 남은 손가락으로 이동을 이어갑니다.
        const t = e.touches[0]
        gesture = { mode: 'pan', startX: t.clientX, startY: t.clientY, origX: panStateRef.current.x, origY: panStateRef.current.y }
      } else if (e.touches.length === 0) {
        gesture = null
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchEnd, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onBackgroundMouseDown = (e: React.MouseEvent) => {
    // 자식(박스)이 이미 자기 드래그를 시작했다면 stopPropagation로 여기까지 안 옵니다.
    panRef.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y, moved: false }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = panRef.current
      if (!p) return
      const dx = e.clientX - p.startX
      const dy = e.clientY - p.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) p.moved = true
      setPan({ x: p.origX + dx, y: p.origY + dy })
    }
    const onUp = () => { panRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div>
      <div
        ref={outerRef}
        onMouseDown={onBackgroundMouseDown}
        style={{
          width: '100%',
          height: frameHeight,
          overflow: 'hidden',
          position: 'relative',
          background: '#EFEAD9',
          borderRadius: 18,
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            width,
            height,
            background,
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          }}
        >
          {children(scale)}
        </div>

        {/* 줌 컨트롤 */}
        <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => zoomBy(1.2)}
            style={zoomBtnStyle}
            title="확대"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => zoomBy(1 / 1.2)}
            style={zoomBtnStyle}
            title="축소"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={fitToView}
            style={zoomBtnStyle}
            title="전체 보기"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        <div style={{ position: 'absolute', left: 12, bottom: 12, fontSize: 11, fontWeight: 700, color: '#8A7C60', background: 'rgba(255,255,255,0.8)', borderRadius: 999, padding: '3px 10px' }}>
          {Math.round((scale / fitScale) * 100)}%
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#8A7C60', textAlign: 'center', marginTop: 8 }}>
        💡 마우스 휠(또는 두 손가락 핀치)로 확대/축소, 드래그(한 손가락)로 화면을 움직일 수 있습니다.
      </p>
    </div>
  )
}

const zoomBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: '1px solid #E7D6AC',
  background: '#fff',
  color: '#3B3324',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
}
