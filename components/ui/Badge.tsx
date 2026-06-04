import type { ReservationStatus } from '@/types'
import { getStatusLabel } from '@/lib/utils'

interface BadgeProps {
  status: ReservationStatus
  size?: 'sm' | 'md'
}

const colorMap: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  approved: 'bg-blue-100 text-blue-900 border border-blue-300',
  rejected: 'bg-red-100 text-red-700 border border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border border-gray-300',
  admin_cancelled: 'bg-orange-100 text-orange-700 border border-orange-300',
}

export default function Badge({ status, size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colorMap[status]} ${sizeClass}`}>
      {getStatusLabel(status)}
    </span>
  )
}
