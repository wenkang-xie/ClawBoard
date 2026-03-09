import { ReactNode } from 'react'

interface MemoryStateBannerProps {
  type: 'error' | 'empty' | 'partial' | 'stale'
  title: string
  description: string
  action?: ReactNode
}

const toneMap = {
  error: 'border-red-900/70 bg-red-950/30 text-red-200',
  empty: 'border-gray-800 bg-gray-950/60 text-gray-300',
  partial: 'border-yellow-900/60 bg-yellow-950/20 text-yellow-200',
  stale: 'border-yellow-900/60 bg-yellow-950/20 text-yellow-200',
} as const

export function MemoryStateBanner({ type, title, description, action }: MemoryStateBannerProps) {
  return (
    <div className={`rounded-lg border p-3 ${toneMap[type]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs opacity-80">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
