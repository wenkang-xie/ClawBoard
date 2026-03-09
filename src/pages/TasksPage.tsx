import { useRunsJson, useRunningTasksMd } from '../hooks/useFileData'
import { KanbanBoard } from '../components/tasks/KanbanBoard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

export function TasksPage() {
  const { data: runsData, isLoading: runsLoading, error: runsError } = useRunsJson()
  const { data: tasksMd, isLoading: mdLoading, error: mdError } = useRunningTasksMd()

  const runs = runsData?.runs || {}
  const loading = runsLoading && mdLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          任务看板 · {Object.keys(runs).length} 个 subagent 运行记录
        </p>
      </div>

      {/* Error notices */}
      {runsError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            runs.json 数据暂不可用（Dashboard 当前版本仅支持 Sessions 数据，Tasks 数据查看请使用 CLI）
          </p>
        </div>
      )}
      {mdError && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-400">
            ⚠ running_tasks.md 读取失败：{String(mdError)}
          </p>
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="lg" message="加载任务数据..." />
      ) : (
        <KanbanBoard runs={runs} tasksMd={tasksMd} />
      )}
    </div>
  )
}
