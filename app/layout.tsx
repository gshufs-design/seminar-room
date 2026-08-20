import type { Metadata } from 'next'
import './globals.css'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: '한국외국어대학교 일반대학원 총학생회 예약 시스템',
  description: '한국외국어대학교 일반대학원 총학생회 세미나실·사물함 예약 시스템입니다.',
  keywords: ['세미나실', '사물함', '예약', '한국외국어대학교', '대학원', '총학생회'],
  openGraph: {
    title: '한국외국어대학교 일반대학원 총학생회 예약 시스템',
    description: '세미나실·사물함 예약 시스템',
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
      <body className="min-h-screen bg-[#f5f6fa] flex flex-col">
        {children}
        <Footer />
      </body>
    </html>
  )
}
