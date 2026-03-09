import { ReactNode } from 'react'

interface KanbanColumnProps {
  title: string
  count: number
  color: string
  children: ReactNode
}

export function KanbanColumn({ title, count, color, children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-64 flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm font-medium text-gray-300">{title}</span>
        <span className="ml-auto text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 min-h-24">
        {children}
      </div>
    </div>
  )
}
