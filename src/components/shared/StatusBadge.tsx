interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'running' | 'done' | 'error' | 'blocked'
  label?: string
  size?: 'sm' | 'md'
}

const statusConfig = {
  online: { dot: 'bg-green-400', text: 'text-green-400', label: '在线' },
  running: { dot: 'bg-blue-400', text: 'text-blue-400', label: '运行中' },
  done: { dot: 'bg-green-400', text: 'text-green-400', label: '完成' },
  warning: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: '警告' },
  blocked: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: '阻塞' },
  offline: { dot: 'bg-gray-400', text: 'text-gray-400', label: '离线' },
  error: { dot: 'bg-red-400', text: 'text-red-400', label: '错误' },
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} ${config.text}`}>
      <span className={`${dotSize} rounded-full ${config.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
      {label ?? config.label}
    </span>
  )
}
