import Header from '@/components/Header'
import Link from 'next/link'
import { CalendarDays, Archive, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const options = [
    {
      href: '/seminar',
      title: '세미나실 예약',
      description: '날짜와 시간을 선택해 대학원 세미나실을 예약합니다.',
      icon: CalendarDays,
    },
    {
      href: '/lockers',
      title: '사물함 예약',
      description: '로비·열람실 앞 사물함 중 원하는 칸을 신청합니다.',
      icon: Archive,
    },
  ]

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">한국외국어대학교 일반대학원 총학생회</h1>
          <p className="text-base text-gray-500 mt-2">예약 시스템</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {options.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-start gap-4 hover:border-[#003087] hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-[#003087]/10 flex items-center justify-center text-[#003087]">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
              <span className="mt-auto flex items-center gap-1 text-sm font-medium text-[#003087] group-hover:gap-2 transition-all">
                바로가기 <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
