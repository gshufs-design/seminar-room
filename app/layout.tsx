import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '한국외국어대학교 대학원 세미나실 예약 시스템',
  description: '한국외국어대학교 대학원 공용 세미나실 예약 시스템입니다.',
  keywords: ['세미나실', '예약', '한국외국어대학교', '대학원'],
  openGraph: {
    title: '한국외국어대학교 대학원 세미나실 예약 시스템',
    description: '대학원 공용 세미나실 예약 시스템',
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#f5f6fa]">{children}</body>
    </html>
  )
}
