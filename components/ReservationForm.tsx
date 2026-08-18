'use client'

import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'
import { createReservation } from '@/lib/actions/reservations'
import { padHour } from '@/lib/utils'
import { CheckCircle2, Users } from 'lucide-react'
import type { CoUser } from '@/types'

interface ReservationFormProps {
  isOpen: boolean
  onClose: () => void
  date: string
  startHour: number
  endHour: number
  onSuccess: () => void
}

interface FormState {
  name: string
  department: string
  student_id: string
  phone: string
  participant_count: string
  purpose: string
}

const initialForm: FormState = {
  name: '',
  department: '',
  student_id: '',
  phone: '',
  participant_count: '',
  purpose: '',
}

export default function ReservationForm({
  isOpen,
  onClose,
  date,
  startHour,
  endHour,
  onSuccess,
}: ReservationFormProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [reservationNumber, setReservationNumber] = useState<number | null>(null)
  const [coUsers, setCoUsers] = useState<CoUser[]>([])
  const [showCoUsersModal, setShowCoUsersModal] = useState(false)
  const [coUserErrors, setCoUserErrors] = useState<Partial<CoUser>[]>([])
  const [coUsersError, setCoUsersError] = useState('')

  const [y, m, d] = date.split('-')
  const formattedDate = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`

  const participantCount = parseInt(form.participant_count)
  const coUserCount = isNaN(participantCount) || participantCount < 2 ? 0 : participantCount - 1

  useEffect(() => {
    setCoUsers((prev) => {
      if (coUserCount === 0) return []
      if (prev.length === coUserCount) return prev
      if (prev.length < coUserCount) {
        return [
          ...prev,
          ...Array.from({ length: coUserCount - prev.length }, () => ({ name: '', department: '', student_id: '' })),
        ]
      }
      return prev.slice(0, coUserCount)
    })
  }, [coUserCount])

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {}
    if (!form.name.trim()) newErrors.name = '이름을 입력해 주세요.'
    if (!form.department.trim()) newErrors.department = '학과를 입력해 주세요.'
    if (!form.student_id.trim()) newErrors.student_id = '학번을 입력해 주세요.'
    if (!form.phone.trim()) newErrors.phone = '연락처를 입력해 주세요.'
    if (!/^\d{10,11}$/.test(form.phone.replace(/-/g, ''))) {
      newErrors.phone = '올바른 연락처 형식을 입력해 주세요. (예: 01012345678)'
    }
    const count = parseInt(form.participant_count)
    if (!form.participant_count || isNaN(count) || count < 1) {
      newErrors.participant_count = '사용 인원을 입력해 주세요. (최소 1명)'
    }
    if (!form.purpose.trim()) newErrors.purpose = '사용 목적을 입력해 주세요.'

    let coUsersOk = true
    if (coUserCount >= 1) {
      const allFilled = coUsers.every((cu) => cu.name.trim() && cu.department.trim() && cu.student_id.trim())
      if (!allFilled) {
        coUsersOk = false
        setCoUsersError('동반 이용자 정보를 모두 입력해주세요.')
      } else {
        setCoUsersError('')
      }
    } else {
      setCoUsersError('')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && coUsersOk
  }

  const validateCoUsers = (): boolean => {
    const errs = coUsers.map((cu) => {
      const err: Partial<CoUser> = {}
      if (!cu.name.trim()) err.name = '이름을 입력해 주세요.'
      if (!cu.department.trim()) err.department = '학과를 입력해 주세요.'
      if (!cu.student_id.trim()) err.student_id = '학번을 입력해 주세요.'
      return err
    })
    setCoUserErrors(errs)
    return errs.every((e) => Object.keys(e).length === 0)
  }

  const handleSubmit = async () => {
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    const result = await createReservation({
      name: form.name.trim(),
      department: form.department.trim(),
      student_id: form.student_id.trim(),
      phone: form.phone.replace(/-/g, ''),
      participant_count: parseInt(form.participant_count),
      reservation_date: date,
      start_hour: startHour,
      end_hour: endHour,
      purpose: form.purpose.trim(),
      co_users: coUserCount > 0 ? coUsers : [],
    })
    setSubmitting(false)

    if (!result.success) {
      setServerError(result.error ?? '예약 신청에 실패했습니다.')
      return
    }

    setSuccess(true)
    setReservationNumber(result.reservation?.reservation_number ?? null)
    onSuccess()
  }

  const handleClose = () => {
    setForm(initialForm)
    setErrors({})
    setServerError('')
    setSuccess(false)
    setReservationNumber(null)
    setCoUsers([])
    setShowCoUsersModal(false)
    setCoUserErrors([])
    setCoUsersError('')
    onClose()
  }

  const change = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((err) => ({ ...err, [field]: undefined }))
  }

  const changeCoUser = (index: number, field: keyof CoUser) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoUsers((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: e.target.value }
      return updated
    })
    setCoUserErrors((prev) => {
      const updated = [...prev]
      if (updated[index]) updated[index] = { ...updated[index], [field]: undefined }
      return updated
    })
  }

  const handleCoUsersSave = () => {
    if (!validateCoUsers()) return
    setCoUsersError('')
    setShowCoUsersModal(false)
  }

  const filledCoUsers = coUsers.filter((cu) => cu.name.trim() && cu.department.trim() && cu.student_id.trim()).length

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="예약 신청" size="md">
        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">예약 신청 완료</h3>
            {reservationNumber && (
              <p className="text-sm text-gray-500 mb-1">예약번호: <span className="font-bold text-[#003087]">#{reservationNumber}</span></p>
            )}
            <p className="text-sm text-gray-500 mb-4">
              관리자 승인 후 세미나실을 이용하실 수 있습니다.
            </p>
            <div className="bg-blue-50 rounded p-3 text-left text-sm text-gray-700 mb-5 space-y-1">
              <div><span className="text-gray-500">일시:</span> {formattedDate} {padHour(startHour)} ~ {padHour(endHour)}</div>
              <div><span className="text-gray-500">신청자:</span> {form.name} ({form.department})</div>
            </div>
            <Button onClick={handleClose} className="w-full">확인</Button>
          </div>
        ) : (
          <>
            {/* 예약 정보 요약 */}
            <div className="bg-blue-50 rounded p-3 mb-5 text-sm text-gray-700 space-y-1">
              <div className="font-medium text-[#003087]">예약 정보</div>
              <div><span className="text-gray-500">날짜:</span> {formattedDate}</div>
              <div><span className="text-gray-500">시간:</span> {padHour(startHour)} ~ {padHour(endHour)} ({endHour - startHour}시간)</div>
            </div>

            <div className="space-y-4">
              <Input label="이름" required placeholder="홍길동" value={form.name} onChange={change('name')} error={errors.name} />
              <Input label="학과" required placeholder="컴퓨터공학과" value={form.department} onChange={change('department')} error={errors.department} />
              <Input label="학번" required placeholder="2024123456" value={form.student_id} onChange={change('student_id')} error={errors.student_id} />
              <Input label="연락처" required placeholder="01012345678" value={form.phone} onChange={change('phone')} error={errors.phone} maxLength={13} />
              <Input label="사용 인원" required type="number" min={1} max={50} placeholder="5" value={form.participant_count} onChange={change('participant_count')} error={errors.participant_count} />

              {/* 동반 이용자 정보 입력 버튼 */}
              {coUserCount >= 1 && (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setShowCoUsersModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium hover:bg-blue-50 transition-colors ${
                      coUsersError ? 'border-red-400 text-red-600' : 'border-[#003087] text-[#003087]'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    동반 이용자 정보 입력 ({filledCoUsers}/{coUserCount}명 완료)
                  </button>
                  {coUsersError && <p className="text-xs text-red-500">{coUsersError}</p>}
                </div>
              )}

              {/* 사용 목적 */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  사용 목적 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="예: 스터디 모임, 팀 프로젝트 회의 등"
                  value={form.purpose}
                  onChange={change('purpose')}
                  className={`w-full px-3 py-2 border rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-[#003087] resize-none ${errors.purpose ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.purpose && <p className="text-xs text-red-500">{errors.purpose}</p>}
                <p className="text-xs text-amber-600">※ 사용 목적 외 이용 시 이용이 제한될 수 있습니다.</p>
              </div>
            </div>

            {serverError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleClose} className="flex-1">취소</Button>
              <Button onClick={handleSubmit} loading={submitting} className="flex-1">신청하기</Button>
            </div>
          </>
        )}
      </Modal>

      {/* 동반 이용자 정보 입력 모달 */}
      <Modal isOpen={showCoUsersModal} onClose={() => setShowCoUsersModal(false)} title="동반 이용자 정보 입력" size="md">
        <div className="space-y-5">
          <p className="text-sm text-gray-500">신청자 외 동반 이용자 {coUserCount}명의 정보를 입력해 주세요.</p>
          {coUsers.map((cu, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-[#003087]">동반자 {idx + 1}</div>
              <Input
                label="이름"
                required
                placeholder="홍길동"
                value={cu.name}
                onChange={changeCoUser(idx, 'name')}
                error={coUserErrors[idx]?.name}
              />
              <Input
                label="학과"
                required
                placeholder="컴퓨터공학과"
                value={cu.department}
                onChange={changeCoUser(idx, 'department')}
                error={coUserErrors[idx]?.department}
              />
              <Input
                label="학번"
                required
                placeholder="2024123456"
                value={cu.student_id}
                onChange={changeCoUser(idx, 'student_id')}
                error={coUserErrors[idx]?.student_id}
              />
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowCoUsersModal(false)} className="flex-1">취소</Button>
            <Button onClick={handleCoUsersSave} className="flex-1">저장</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
