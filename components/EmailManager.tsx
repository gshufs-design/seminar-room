'use client'

import { useState } from 'react'
import Button from './ui/Button'
import Input from './ui/Input'
import { updateNotificationEmail } from '@/lib/actions/admin'
import { Mail } from 'lucide-react'

interface EmailManagerProps {
  currentEmail: string | null
  resendConfigured?: boolean
}

export default function EmailManager({ currentEmail, resendConfigured }: EmailManagerProps) {
  const [email, setEmail] = useState(currentEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    setMessage(null)
    setLoading(true)
    const result = await updateNotificationEmail(email.trim())
    setLoading(false)
    if (result.success) {
      setMessage({ type: 'success', text: email.trim() ? '알림 이메일이 저장되었습니다.' : '알림 이메일이 해제되었습니다.' })
    } else {
      setMessage({ type: 'error', text: result.error ?? '저장에 실패했습니다.' })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Mail className="w-5 h-5 text-[#003087]" />
        <h3 className="font-semibold text-gray-900">예약 알림 이메일 설정</h3>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        새 예약 신청이 접수되면 아래 이메일 주소로 알림을 발송합니다.
        비워두면 알림이 발송되지 않습니다.
      </p>

      <div className="flex gap-3">
        <Input
          type="email"
          placeholder="관리자 이메일 주소 입력"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        />
        <Button onClick={handleSubmit} loading={loading}>저장</Button>
      </div>

      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message.text}
        </p>
      )}

      {!resendConfigured && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          환경변수 <code className="font-mono">RESEND_API_KEY</code>가 설정되지 않아 이메일이 발송되지 않습니다.
        </div>
      )}
    </div>
  )
}
