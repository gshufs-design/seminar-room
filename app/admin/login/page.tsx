'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin } from '@/lib/actions/admin'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Building2, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.')
      return
    }
    setLoading(true)
    const result = await adminLogin(username, password)
    setLoading(false)
    if (result.success) {
      router.push('/admin')
      router.refresh()
    } else {
      setError(result.error ?? '로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-[#003087] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">한국외국어대학교</h1>
          <p className="text-blue-200 text-sm mt-1">세미나실 예약 시스템 관리자</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-[#003087]" />
            <h2 className="text-lg font-semibold text-gray-900">관리자 로그인</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="아이디"
              placeholder="아이디 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              autoFocus
            />
            <Input
              label="비밀번호"
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <Button className="w-full mt-6" onClick={handleLogin} loading={loading} size="lg">
            로그인
          </Button>
        </div>

        <p className="text-center text-xs text-blue-300 mt-6">
          관리자 전용 페이지입니다.
        </p>
      </div>
    </div>
  )
}
