import { useState, useEffect, useCallback } from 'react'

interface RefreshStatusProps {
  isRefetching: boolean
  lastUpdated?: number
  onManualRefresh?: () => void
  autoRefreshInterval?: number // in ms
  isDegraded?: boolean
  degradedAfterMs?: number
  degradedMessage?: string
  idleLabel?: string
}

export function RefreshStatus({ 
  isRefetching, 
  lastUpdated, 
  onManualRefresh,
  autoRefreshInterval = 30_000,
  isDegraded = false,
  degradedAfterMs,
  degradedMessage,
  idleLabel,
}: RefreshStatusProps) {
  const [now, setNow] = useState(Date.now())
  
  // Update "now" every 10 seconds to show relative time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(interval)
  }, [])

  const timeAgo = lastUpdated ? Math.floor(Math.max(0, now - lastUpdated) / 1000) : null
  const secondsAgo = timeAgo !== null ? timeAgo : null
  const ageMs = secondsAgo !== null ? secondsAgo * 1000 : null
  const staleDegraded = degradedAfterMs !== undefined && ageMs !== null && ageMs > degradedAfterMs
  const showDegraded = isDegraded || staleDegraded
  
  // Calculate auto-refresh progress (visual indicator)
  const refreshProgress = secondsAgo !== null 
    ? Math.min(100, (secondsAgo / (autoRefreshInterval / 1000)) * 100)
    : 0

  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 5) return '刚刚'
    if (seconds < 60) return `${seconds}秒前`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分钟前`
  }

  return (
    <div className="flex items-center gap-3">
      {/* Auto-refresh indicator */}
      <div className="flex items-center gap-1.5">
        {isRefetching ? (
          <>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400">刷新中...</span>
          </>
        ) : showDegraded ? (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-300">
              {degradedMessage || '刷新降级'}
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-500">
              {secondsAgo !== null 
                ? `${formatTimeAgo(secondsAgo)}更新`
                : (idleLabel || '自动刷新中')}
            </span>
          </>
        )}
      </div>

      {/* Progress bar showing time until next refresh */}
      {!isRefetching && !showDegraded && secondsAgo !== null && secondsAgo < (autoRefreshInterval / 1000) && (
        <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-1000 ease-linear"
            style={{ width: `${100 - refreshProgress}%` }}
          />
        </div>
      )}

      {/* Manual refresh button */}
      {onManualRefresh && (
        <button
          onClick={onManualRefresh}
          disabled={isRefetching}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
          title="手动刷新"
        >
          <svg 
            className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  )
}
