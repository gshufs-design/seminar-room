import { Resend } from 'resend'
import type { Reservation, LockerRequest } from '@/types'
import { TERM_LABELS } from '@/lib/lockers/data'

// RESEND_API_KEY가 없어도 앱 전체가 죽지 않도록, 실제로 이메일을 보낼 때만 생성합니다.
// (이전에는 모듈을 불러오는 순간 new Resend(undefined)가 바로 예외를 던져서,
//  로컬에 키가 없으면 예약/신청 화면 전체가 500 에러로 죽었습니다.)
let resendClient: Resend | null = null
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

// Resend에서 인증된 발신 도메인을 RESEND_FROM_EMAIL 환경변수로 설정하세요.
// 인증되지 않은 도메인으로 발송하면 Resend API가 422 오류를 반환합니다.
// 예: RESEND_FROM_EMAIL=noreply@yourdomain.com
const FROM_EMAIL = 'onboarding@resend.dev'

const STATUS_LABELS: Record<string, string> = {
  pending: '승인 대기',
  approved: '승인',
  rejected: '거절',
  cancelled: '취소',
}

export async function sendNewReservationNotification(
  reservation: Reservation,
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY가 설정되지 않아 이메일을 발송하지 않았습니다.')
    return { success: false, error: 'RESEND_API_KEY not set' }
  }
  const resend = getResendClient()!

  const dateLabel = reservation.reservation_date
  const startHour = reservation.start_time.substring(0, 5)
  const endHour = reservation.end_time.substring(0, 5)

  const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: 'gshufs@hufs.ac.kr',
      subject: `[세미나실 예약] 새 예약 신청 - ${reservation.name} (${dateLabel})`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #003087; padding: 24px 32px;">
            <h1 style="color: #fff; margin: 0; font-size: 18px; font-weight: 700;">
              한국외국어대학교 일반대학원 총학생회
            </h1>
            <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">세미나실 예약 시스템</p>
          </div>

          <div style="padding: 28px 32px;">
            <p style="font-size: 15px; color: #111827; margin: 0 0 20px;">
              새로운 세미나실 예약 신청이 접수되었습니다.
            </p>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tbody>
                ${[
                  ['예약 번호', `#${reservation.reservation_number}`],
                  ['신청자', reservation.name],
                  ['학과', reservation.department],
                  ['학번', reservation.student_id],
                  ['연락처', reservation.phone],
                  ['사용 인원', `${reservation.participant_count}명`],
                  ['예약 날짜', dateLabel],
                  ['예약 시간', `${startHour} ~ ${endHour}`],
                  ['상태', STATUS_LABELS[reservation.status] ?? reservation.status],
                ]
                  .map(
                    ([label, value]) => `
                  <tr>
                    <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 100px;">${label}</td>
                    <td style="padding: 10px 0; color: #111827; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${value}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>

            <div style="margin-top: 24px; padding: 16px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #003087;">
              <p style="margin: 0; font-size: 13px; color: #1e40af;">
                관리자 페이지에 접속하여 예약을 승인하거나 거절해 주세요.
              </p>
            </div>
          </div>

          <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              한국외국어대학교 일반대학원 총학생회 · 문의: gshufs@hanmail.net
            </p>
          </div>
        </div>
      `,
    })

  if (error) {
    console.error('[email] Resend API 오류:', JSON.stringify(error))
    return { success: false, error: error.message }
  }

  console.log('[email] 발송 성공. id:', data?.id, '→', toEmail)
  return { success: true }
}

export async function sendNewLockerRequestNotification(
  request: LockerRequest,
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY가 설정되지 않아 이메일을 발송하지 않았습니다.')
    return { success: false, error: 'RESEND_API_KEY not set' }
  }
  const resend = getResendClient()!

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: 'gshufs@hufs.ac.kr',
    subject: `[사물함 신청] 새 신청 - ${request.name} (${request.zone_label} ${request.locker_number}번)`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: #003087; padding: 24px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 18px; font-weight: 700;">
            한국외국어대학교 일반대학원 총학생회
          </h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">사물함 예약 시스템</p>
        </div>

        <div style="padding: 28px 32px;">
          <p style="font-size: 15px; color: #111827; margin: 0 0 20px;">
            새로운 사물함 신청이 접수되었습니다.
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              ${[
                ['위치', `${request.zone_label} · ${request.block_label}`],
                ['사물함 번호', `${request.locker_number}번`],
                ['신청자', request.name],
                ['학과', request.department],
                ['학번', request.student_id],
                ['연락처', request.phone],
                ['이메일', request.email],
                ['신청 학기', TERM_LABELS[request.term] ?? request.term],
              ]
                .map(
                  ([label, value]) => `
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 100px;">${label}</td>
                  <td style="padding: 10px 0; color: #111827; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${value}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 16px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #003087;">
            <p style="margin: 0; font-size: 13px; color: #1e40af;">
              관리자 페이지(사물함 신청 관리)에서 승인하거나 거절해 주세요.
            </p>
          </div>
        </div>

        <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            한국외국어대학교 일반대학원 총학생회 · 문의: gshufs@hanmail.net
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Resend API 오류:', JSON.stringify(error))
    return { success: false, error: error.message }
  }

  console.log('[email] 발송 성공. id:', data?.id, '→', toEmail)
  return { success: true }
}
