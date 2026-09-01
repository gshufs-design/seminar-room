'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LayoutDashboard, LogOut, Menu, X, Archive } from 'lucide-react'
import { useState } from 'react'
import { adminLogout } from '@/lib/actions/admin'

interface AdminNavProps {
  username: string
}

export default function AdminNav({ username }: AdminNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/admin', label: '세미나실 예약', icon: LayoutDashboard },
    { href: '/admin/lockers', label: '사물함 신청', icon: Archive },
  ]

  const handleLogout = async () => {
    await adminLogout()
  }

  return (
    <header className="bg-[#003087] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div className="leading-tight">
              <div className="text-sm font-bold">총학생회 예약 관리자</div>
              <div className="text-xs text-blue-200">{username}</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors ml-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </nav>

          <button className="md:hidden p-2 rounded hover:bg-white/10" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-blue-700 py-2 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 rounded text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}
