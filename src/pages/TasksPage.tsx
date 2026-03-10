import { useRunsJson, useRunningTasksMd } from '../hooks/useFileData'
import { KanbanBoard } from '../components/tasks/KanbanBoard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { RefreshStatus } from '../components/shared/RefreshStatus'
import { useEffect, useState, useMemo } from 'react'

export function TasksPage() {
  const { 
    data: runsData, 
    isLoading: runsLoading, 
    error: runsError,
    dataUpdatedAt: runsUpdatedAt,
    refetch: refetchRuns,
    isRefetching: isRunsRefetching
  } = useRunsJson()
  
  const { 
    data: tasksMd, 
    isLoading: mdLoading, 
    error: mdError,
    dataUpdatedAt: mdUpdatedAt,
    refetch: refetchMd,
    isRefetching: isMdRefetching
  } = useRunningTasksMd()

  const runs = runsData?.runs || {}
  const loading = runsLoading && mdLoading
  
  // Combined refresh status
  const isRefetching = isRunsRefetching || isMdRefetching
  
  // Use the most recent update time
  const lastUpdated = useMemo(() => {
    const times = [runsUpdatedAt, mdUpdatedAt].filter(Boolean)
    return times.length > 0 ? Math.max(...times) : undefined
  }, [runsUpdatedAt, mdUpdatedAt])

  const handleManualRefresh = () => {
    refetchRuns()
    refetchMd()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            任务看板 · {Object.keys(runs).length} 个 subagent 运行记录
          </p>
        </div>
        
        {/* Refresh status */}
        <RefreshStatus 
          isRefetching={isRefetching}
          lastUpdated={lastUpdated}
          onManualRefresh={handleManualRefresh}
          autoRefreshInterval={15_000}
        />
      </div>

      {/* Error notices */}
      {(runsError || mdError) && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <span className="text-red-400">⚠</span>
          <div className="text-sm">
            {runsError && (
              <p className="text-red-400">
                runs.json: {runsError instanceof Error ? runsError.message : String(runsError)}
              </p>
            )}
            {mdError && (
              <p className="text-yellow-400 mt-1">
                running_tasks.md: {mdError instanceof Error ? mdError.message : String(mdError)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <LoadingSpinner size="lg" message="加载任务数据..." />
      ) : (
        <KanbanBoard runs={runs} tasksMd={tasksMd} />
      )}
      
      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>自动刷新: 15秒 (runs) / 30秒 (tasks)</span>
        {Object.keys(runs).length > 0 && (
          <span>共 {Object.keys(runs).length} 条运行记录</span>
        )}
      </div>
    </div>
  )
}
