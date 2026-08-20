'use client'

import { useEffect, useRef, useState } from 'react'

interface ScaledCanvasProps {
  width: number
  height: number
  background?: string
  children: (scale: number) => React.ReactNode
}

/**
 * width x height 고정 크기로 디자인된 내용을, 실제 화면 폭에 맞춰
 * CSS transform: scale()로 통째로 축소/확대합니다.
 * scale 값을 children에 넘겨주는 이유: 편집 모드에서 드래그 거리를
 * 화면 px가 아니라 "도면 좌표" 기준으로 환산해야 정확히 움직이기 때문입니다.
 */
export default function ScaledCanvas({ width, height, background, children }: ScaledCanvasProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w > 0) setScale(Math.min(1, w / width))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={outerRef} style={{ width: '100%' }}>
      <div style={{ width: width * scale, height: height * scale, margin: '0 auto' }}>
        <div
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'relative',
            background,
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          {children(scale)}
        </div>
      </div>
    </div>
  )
}
