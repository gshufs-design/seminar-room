'use client'

import { useState } from 'react'
import Button from './ui/Button'
import { updateRoomNoticeText } from '@/lib/actions/admin'
import { Info } from 'lucide-react'

interface NoticeManagerProps {
  currentNoticeText: string | null
}

export default function NoticeManager({ currentNoticeText }: NoticeManagerProps) {
  const [text, setText] = useState(currentNoticeText ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    setMessage(null)
    setLoading(true)
    const result = await updateRoomNoticeText(text.trim() || null)
    setLoading(false)
    if (result.success) {
      setMessage({ type: 'success', text: text.trim() ? '이용 안내 문구가 저장되었습니다.' : '이용 안내 문구가 초기화되었습니다.' })
    } else {
      setMessage({ type: 'error', text: result.error ?? '저장에 실패했습니다.' })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Info className="w-5 h-5 text-[#003087]" />
        <h3 className="font-semibold text-gray-900">세미나실 이용 안내 문구</h3>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        세미나실 예약 화면의 &quot;이용 안내&quot; 박스에 표시할 문구입니다.
        비워두면 기본 문구가 대신 표시됩니다.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="운영 시간: 07:00 ~ 23:00 / 최소 1시간, 최대 3시간 단위로 예약 가능합니다.&#10;예약은 시작 시각 기준 24시간 이전에만 신청할 수 있습니다."
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-[#003087]"
      />

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={handleSubmit} loading={loading}>저장</Button>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
