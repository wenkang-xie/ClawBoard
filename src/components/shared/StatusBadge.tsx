interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'running' | 'done' | 'error' | 'blocked'
  label?: string
  size?: 'sm' | 'md'
}

const statusConfig = {
  online: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', label: '在线' },
  running: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', label: '运行中' },
  done: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', label: '完成' },
  warning: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: '警告' },
  blocked: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: '阻塞' },
  offline: { dot: 'bg-gray-400', text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20', label: '离线' },
  error: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: '错误' },
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} ${config.text} ${config.bg} ${config.border} border rounded-full ${padding}`}>
      <span className={`${dotSize} rounded-full ${config.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
      {label ?? config.label}
    </span>
  )
}
