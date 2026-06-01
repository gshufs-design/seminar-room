'use client'

import { useState } from 'react'
import Button from './ui/Button'
import Input from './ui/Input'
import { updateRoomPassword } from '@/lib/actions/admin'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

interface PasswordManagerProps {
  currentPassword: string
}

export default function PasswordManager({ currentPassword }: PasswordManagerProps) {
  const [newPassword, setNewPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    setMessage(null)
    if (!newPassword.trim()) {
      setMessage({ type: 'error', text: '새 비밀번호를 입력해 주세요.' })
      return
    }
    setLoading(true)
    const result = await updateRoomPassword(newPassword.trim())
    setLoading(false)
    if (result.success) {
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setNewPassword('')
    } else {
      setMessage({ type: 'error', text: result.error ?? '변경에 실패했습니다.' })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <KeyRound className="w-5 h-5 text-[#003087]" />
        <h3 className="font-semibold text-gray-900">세미나실 비밀번호 관리</h3>
      </div>

      <div className="mb-5">
        <p className="text-sm text-gray-500 mb-2">현재 비밀번호</p>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold tracking-widest text-[#003087] bg-blue-50 px-6 py-3 rounded-lg">
            {show ? currentPassword : '••••'}
          </div>
          <button
            onClick={() => setShow(!show)}
            className="p-2 rounded hover:bg-gray-100 text-gray-500 transition-colors"
          >
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <p className="text-sm font-medium text-gray-700 mb-3">비밀번호 변경</p>
        <div className="flex gap-3">
          <Input
            placeholder="새 비밀번호 입력"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          />
          <Button onClick={handleSubmit} loading={loading}>변경</Button>
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
