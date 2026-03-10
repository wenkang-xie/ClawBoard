// 工具函数

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}

export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1_000)
  return `${minutes}m${seconds}s`
}

export function truncateKey(key: string, maxLen = 40): string {
  if (key.length <= maxLen) return key
  return key.slice(0, maxLen) + '…'
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getAgentColor(agentId: string): string {
  const colors: Record<string, string> = {
    main: '#3b82f6',     // blue-500 - primary tech blue
    architect: '#06b6d4', // cyan-500 - tech cyan
    research: '#8b5cf6',  // purple - keep for research (different from primary)
    codex: '#10b981',    // emerald
  }
  return colors[agentId] || '#6b7280'
}

export function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'text-yellow-400'
  if (status === 'ok') return 'text-green-400'
  if (status === 'error') return 'text-red-400'
  return 'text-yellow-400'
}

// 计算百分比变化
export function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0 || previous === null || previous === undefined) return null
  return Math.round(((current - previous) / previous) * 100)
}

// 格式化日期为 MM-DD
export function formatDateShort(dateStr: string): string {
  return dateStr.slice(5) // YYYY-MM-DD -> MM-DD
}
