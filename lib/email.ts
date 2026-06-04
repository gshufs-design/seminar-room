import { Resend } from 'resend'
import type { Reservation } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

const STATUS_LABELS: Record<string, string> = {
  pending: '승인 대기',
  approved: '승인',
  rejected: '거절',
  cancelled: '취소',
}

export async function sendNewReservationNotification(
  reservation: Reservation,
  toEmail: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const dateLabel = reservation.reservation_date
  const startHour = reservation.start_time.substring(0, 5)
  const endHour = reservation.end_time.substring(0, 5)

  try {
    await resend.emails.send({
      from: 'noreply@updates.gshufs.kr',
      to: toEmail,
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
  } catch (err) {
    console.error('sendNewReservationNotification error:', err)
  }
}
