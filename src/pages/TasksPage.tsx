import { useMemo, useState } from 'react'
import { TASKS_POLLING_CONFIG, useBffTasks, useRunsJson } from '../hooks/useFileData'
import { KanbanBoard } from '../components/tasks/KanbanBoard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { RefreshStatus } from '../components/shared/RefreshStatus'
import { TaskCreateModal } from '../components/tasks/TaskCreateModal'

function buildDegradedMessage(hasRunsError: boolean, hasTasksError: boolean): string | undefined {
  if (hasRunsError && hasTasksError) return 'runs/tasks 刷新失败'
  if (hasRunsError) return 'runs 刷新失败'
  if (hasTasksError) return 'tasks 刷新失败'
  return undefined
}

export function TasksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const {
    data: runsData,
    isLoading: runsLoading,
    error: runsError,
    dataUpdatedAt: runsUpdatedAt,
    refetch: refetchRuns,
    isRefetching: isRunsRefetching,
  } = useRunsJson()

  const {
    data: tasksResponse,
    isLoading: tasksLoading,
    error: tasksError,
    dataUpdatedAt: tasksUpdatedAt,
    refetch: refetchTasks,
    isRefetching: isTasksRefetching,
  } = useBffTasks()

  const runs = runsData?.runs || {}
  const tasks = tasksResponse?.tasks || []
  const loading = (runsLoading && !runsData) || (tasksLoading && !tasksResponse)
  const isRefetching = isRunsRefetching || isTasksRefetching

  const lastUpdated = useMemo(() => {
    const times = [runsUpdatedAt, tasksUpdatedAt].filter(Boolean)
    return times.length > 0 ? Math.max(...times) : undefined
  }, [runsUpdatedAt, tasksUpdatedAt])

  const handleManualRefresh = () => {
    refetchRuns()
    refetchTasks()
  }

  const handleTaskCreated = () => {
    // Refetch tasks to show the new task
    refetchTasks()
  }

  const degradedMessage = buildDegradedMessage(Boolean(runsError), Boolean(tasksError))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            自动轮询任务看板 · {Object.keys(runs).length} 个 subagent 运行记录 · {tasks.length} 个文档任务
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 lg:items-end">
          <RefreshStatus
            isRefetching={isRefetching}
            lastUpdated={lastUpdated}
            onManualRefresh={handleManualRefresh}
            autoRefreshInterval={TASKS_POLLING_CONFIG.runsIntervalMs}
            degradedAfterMs={TASKS_POLLING_CONFIG.degradedAfterMs}
            isDegraded={Boolean(degradedMessage)}
            degradedMessage={degradedMessage}
            idleLabel="轮询已启动"
          />
          <p className="text-xs text-gray-600">
            runs {TASKS_POLLING_CONFIG.runsIntervalMs / 1000}s · tasks {TASKS_POLLING_CONFIG.tasksIntervalMs / 1000}s · stale {TASKS_POLLING_CONFIG.runsStaleTimeMs / 1000}s/{TASKS_POLLING_CONFIG.tasksStaleTimeMs / 1000}s
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
        </div>
      </div>

      {(runsError || tasksError) && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <span className="text-red-400">⚠</span>
          <div className="text-sm">
            {runsError && (
              <p className="text-red-400">
                runs.json: {runsError instanceof Error ? runsError.message : String(runsError)}
              </p>
            )}
            {tasksError && (
              <p className="text-yellow-400 mt-1">
                tasks: {tasksError instanceof Error ? tasksError.message : String(tasksError)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              React Query 保留默认 2 次重试与指数退避；当前会继续轮询可用数据源。
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="lg" message="加载任务数据..." />
      ) : (
        <KanbanBoard runs={runs} tasks={tasks} />
      )}

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>自动刷新已开启，无需手动 reload 才能看到 runs/tasks 变化</span>
        {Object.keys(runs).length > 0 && (
          <span>共 {Object.keys(runs).length} 条运行记录</span>
        )}
      </div>

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTaskCreated}
      />
    </div>
  )
}
