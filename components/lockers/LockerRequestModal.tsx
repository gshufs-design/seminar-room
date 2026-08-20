'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createLockerRequest, getLockerSettings } from '@/lib/actions/lockers'
import { TERM_LABELS } from '@/lib/lockers/data'
import type { LockerSettings } from '@/types'
import { CheckCircle2, ShieldCheck } from 'lucide-react'

const DEFAULT_AGREEMENT_TEXT = `1. 사물함은 신청 시 선택한 이용 기간(6개월 또는 1년) 동안만 사용할 수 있습니다.
2. 이용 마감일이 지나면 안내된 기간 내에 반드시 물품을 회수해야 하며, 회수하지 않은 물품은 임의로 처리될 수 있습니다.
3. 사물함 내 물품 분실·파손에 대해 총학생회는 책임지지 않습니다.
4. 타인에게 사물함을 양도하거나 대여할 수 없습니다.
5. 위 내용을 확인하지 않아 발생하는 불이익은 신청자 본인이 부담합니다.`

export interface LockerRequestTarget {
  zoneId: string
  blockId: string
  blockLabel: string
  number: number
}

interface LockerRequestModalProps {
  target: LockerRequestTarget | null
  onClose: () => void
  onSuccess: () => void
}

interface FormState {
  department: string
  name: string
  student_id: string
  phone: string
  email: string
  term: '1' | '2'
}

const initialForm: FormState = {
  department: '',
  name: '',
  student_id: '',
  phone: '',
  email: '',
  term: '1',
}

type Step = 'form' | 'agreement' | 'success'

export default function LockerRequestModal({ target, onClose, onSuccess }: LockerRequestModalProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [agreed, setAgreed] = useState(false)
  const [settings, setSettings] = useState<LockerSettings | null>(null)

  useEffect(() => {
    if (target) getLockerSettings().then(setSettings)
  }, [target])

  const endDateFor = (term: '1' | '2') => (term === '1' ? settings?.term1_end_date : settings?.term2_end_date) ?? null

  const handleClose = () => {
    onClose()
    // 닫힘 애니메이션 여유를 두고 폼 리셋
    setTimeout(() => {
      setForm(initialForm)
      setErrors({})
      setServerError('')
      setStep('form')
      setAgreed(false)
    }, 200)
  }

  const validate = (): boolean => {
    const next: Partial<FormState> = {}
    if (!form.department.trim()) next.department = '학과를 입력해 주시기 바랍니다.'
    if (!form.name.trim()) next.name = '이름을 입력해 주시기 바랍니다.'
    if (!form.student_id.trim()) next.student_id = '학번(사번)을 입력해 주시기 바랍니다.'
    if (!form.phone.trim()) next.phone = '연락처를 입력해 주시기 바랍니다.'
    else if (!/^\d{9,11}$/.test(form.phone.replace(/-/g, ''))) next.phone = '올바른 연락처 형식을 입력해 주시기 바랍니다.'
    if (!form.email.trim()) next.email = '이메일을 입력해 주시기 바랍니다.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = '올바른 이메일 주소를 입력해 주시기 바랍니다.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleValidateAndSubmit = async () => {
    if (!target) return
    if (!validate()) return
    if (!agreed) {
      setServerError('사물함 이용 안내 동의가 필요합니다.')
      return
    }

    setSubmitting(true)
    setServerError('')

    const result = await createLockerRequest({
      zone_id: target.zoneId,
      block_id: target.blockId,
      locker_number: target.number,
      department: form.department.trim(),
      name: form.name.trim(),
      student_id: form.student_id.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      term: form.term,
    })

    setSubmitting(false)

    if (!result.success) {
      setServerError(result.error ?? '신청 중 오류가 발생했습니다.')
      return
    }

    setStep('success')
    onSuccess()
  }

  const handleAgree = () => {
    setAgreed(true)
    setStep('form')
  }

  if (!target) return null

  const modalTitle = step === 'agreement' ? '사물함 이용 안내 동의' : '사물함 신청'

  return (
    <Modal isOpen={!!target} onClose={handleClose} title={modalTitle} size="sm">
      {step === 'success' ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">신청이 접수되었습니다</p>
          <p className="text-sm text-gray-500 mb-6">
            {target.blockLabel} · {target.number}번
            <br />
            관리자 승인 후 예약이 확정됩니다.
            {endDateFor(form.term) && (
              <>
                <br />
                이용 마감일: {endDateFor(form.term)}
              </>
            )}
          </p>
          <Button variant="primary" onClick={handleClose} className="w-full">
            확인
          </Button>
        </div>
      ) : step === 'form' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{target.blockLabel}</span> · {target.number}번 사물함을 신청합니다.
          </p>

          <Input
            label="학과"
            required
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            error={errors.department}
            placeholder="예) 국어국문과"
          />
          <Input
            label="이름"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input
            label="학번(사번)"
            required
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            error={errors.student_id}
          />
          <Input
            label="연락처"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
            placeholder="010-0000-0000"
          />
          <Input
            label="이메일"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            placeholder="example@hufs.ac.kr"
          />

          <div>
            <label className="text-sm font-medium text-gray-700">
              신청 기간
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['1', '2'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, term: t })}
                  className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${
                    form.term === t
                      ? 'bg-[#003087] text-white border-[#003087]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#003087]'
                  }`}
                >
                  {TERM_LABELS[t]}
                </button>
              ))}
            </div>
            {endDateFor(form.term) && (
              <p className="text-xs text-gray-500 mt-1.5">📅 {endDateFor(form.term)}까지 이용할 수 있습니다.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep('agreement')}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium border transition-colors ${
              agreed
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-white text-[#003087] border-[#003087]/40 hover:bg-[#003087]/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {agreed ? '사물함 이용 안내 동의 완료' : '사물함 이용 안내 동의'}
          </button>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              취소
            </Button>
            <Button variant="primary" onClick={handleValidateAndSubmit} loading={submitting} className="flex-[2]">
              신청하기
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <ShieldCheck className="w-4 h-4 text-[#003087] flex-shrink-0 mt-0.5" />
            <p>신청을 접수하기 전에, 아래 사물함 이용 안내 사항을 확인해 주시기 바랍니다.</p>
          </div>

          <div className="max-h-64 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-line">
            {settings?.agreement_text || DEFAULT_AGREEMENT_TEXT}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
              이전
            </Button>
            <Button variant="primary" onClick={handleAgree} className="flex-[2]">
              동의합니다
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
