'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLockerLayoutOverrides, saveLockerLayoutOverrides } from '@/lib/actions/lockers'
import type { LockerLayoutOverrides, LockerLayoutOverride } from '@/types'

export function useEditableLayout(sceneId: string, isAdmin: boolean) {
  const [overrides, setOverrides] = useState<LockerLayoutOverrides>({})
  const [ready, setReady] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    getLockerLayoutOverrides(sceneId).then((data) => {
      if (!cancelled) setOverrides(data)
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [sceneId])

  const persist = useCallback(
    (next: LockerLayoutOverrides) => {
      if (!isAdmin) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveLockerLayoutOverrides(sceneId, next)
      }, 500)
    },
    [sceneId, isAdmin]
  )

  const updateOverride = useCallback(
    (id: string, patch: Partial<LockerLayoutOverride>, base: LockerLayoutOverride) => {
      setOverrides((prev) => {
        const current = prev[id] ?? { x: base.x, y: base.y, w: base.w, h: base.h, label: base.label, rangeStart: base.rangeStart, rangeEnd: base.rangeEnd, cols: base.cols }
        const next = { ...prev, [id]: { ...current, ...patch } }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const resetLayout = useCallback(() => {
    setOverrides({})
    persist({})
  }, [persist])

  return { overrides, ready, editMode, setEditMode, updateOverride, resetLayout }
}
