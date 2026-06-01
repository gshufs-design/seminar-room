'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { MonthlyStats } from '@/types'
import { getMonthlyStats } from '@/lib/actions/admin'
import Button from './ui/Button'
import { TrendingUp, Users, CheckCircle, XCircle, Clock } from 'lucide-react'

const COLORS = ['#003087', '#3760b7', '#5879c2', '#9fb1dc', '#c5d0ea']

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface StatsViewProps {
  initialStats: MonthlyStats
  initialYear: number
  initialMonth: number
}

export default function StatsView({ initialStats, initialYear, initialMonth }: StatsViewProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [stats, setStats] = useState<MonthlyStats>(initialStats)
  const [loading, setLoading] = useState(false)

  const handleMonthChange = async (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
    setLoading(true)
    const data = await getMonthlyStats(newYear, newMonth)
    setStats(data)
    setLoading(false)
  }

  const prevMonth = () => {
    if (month === 1) handleMonthChange(year - 1, 12)
    else handleMonthChange(year, month - 1)
  }
  const nextMonth = () => {
    if (month === 12) handleMonthChange(year + 1, 1)
    else handleMonthChange(year, month + 1)
  }

  const pieData = [
    { name: '승인', value: stats.approved },
    { name: '거절', value: stats.rejected },
    { name: '취소', value: stats.cancelled },
    { name: '대기', value: stats.pending },
  ].filter((d) => d.value > 0)

  return (
    <div>
      {/* Month selector */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 rounded hover:bg-gray-100">◀</button>
        <h2 className="text-lg font-bold text-gray-900">{year}년 {month}월</h2>
        <button onClick={nextMonth} className="p-2 rounded hover:bg-gray-100">▶</button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">통계를 불러오는 중...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="총 예약" value={stats.total} icon={<TrendingUp className="w-6 h-6" />} color="text-gray-700" />
            <StatCard label="승인" value={stats.approved} icon={<CheckCircle className="w-6 h-6" />} color="text-[#003087]" />
            <StatCard label="신청 대기" value={stats.pending} icon={<Clock className="w-6 h-6" />} color="text-yellow-600" />
            <StatCard label="거절" value={stats.rejected} icon={<XCircle className="w-6 h-6" />} color="text-red-600" />
            <StatCard label="취소" value={stats.cancelled} icon={<Users className="w-6 h-6" />} color="text-gray-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie chart */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">예약 상태 분포</h3>
              {pieData.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">데이터 없음</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Department chart */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">학과별 이용 현황 (승인·대기 기준)</h3>
              {stats.byDepartment.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">데이터 없음</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byDepartment.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#003087" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Daily chart */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 예약 현황</h3>
            {stats.byDay.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">데이터 없음</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.byDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => v} />
                  <Bar dataKey="count" fill="#003087" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  )
}
