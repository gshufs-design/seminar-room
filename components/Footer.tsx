import { Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#001a4d] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-white">한국외국어대학교 일반대학원 총학생회</p>
            <p className="text-xs text-blue-300 mt-0.5">HUFS Graduate School Student Council</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-blue-100">
            <a
              href="mailto:gshufs@hanmail.net"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
              gshufs@hanmail.net
            </a>
            <a
              href="tel:02-2173-2391"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
              02-2173-2391
            </a>
          </div>
        </div>

        <div className="border-t border-blue-900 mt-6 pt-4">
          <p className="text-xs text-blue-400 text-center">
            © {new Date().getFullYear()} 한국외국어대학교 일반대학원 총학생회. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
