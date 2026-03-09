import { RunRecord } from '../../hooks/useFileData'
import { formatRelativeTime, formatDuration, truncateKey } from '../../lib/utils'
import { StatusBadge } from '../shared/StatusBadge'

interface TaskCardProps {
  run?: RunRecord
  title?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'done' | 'blocked'
  checkboxes?: { text: string; checked: boolean }[]
}

export function TaskCard({ run, title, description, status: propStatus, checkboxes }: TaskCardProps) {
  // Derive status from run
  const status = propStatus || ((): 'todo' | 'in_progress' | 'done' | 'blocked' => {
    if (!run) return 'todo'
    if (!run.outcome) return 'in_progress'
    if (run.outcome.status === 'ok') return 'done'
    if (run.outcome.status === 'error') {
      return run.outcome.error === 'killed' ? 'blocked' : 'blocked'
    }
    return 'in_progress'
  })()

  const badgeStatus: 'running' | 'done' | 'blocked' | 'warning' = {
    todo: 'warning' as const,
    in_progress: 'running' as const,
    done: 'done' as const,
    blocked: 'blocked' as const,
  }[status]

  const duration = run?.endedAt && run?.startedAt ? run.endedAt - run.startedAt : null
  const displayTitle = title || (run?.task ? run.task.slice(0, 60) + (run.task.length > 60 ? '…' : '') : '未知任务')

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-colors">
      {/* Status + timing */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <StatusBadge status={badgeStatus} size="sm" />
        {duration !== null && (
          <span className="text-xs text-gray-600">{formatDuration(duration)}</span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-gray-300 font-medium line-clamp-2 mb-1">
        {displayTitle}
      </p>

      {/* Description or task excerpt */}
      {description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{description}</p>
      )}

      {/* Checkboxes */}
      {checkboxes && checkboxes.length > 0 && (
        <div className="space-y-1 mb-2">
          {checkboxes.slice(0, 3).map((cb, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center
                ${cb.checked ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                {cb.checked && <span className="text-white text-xs leading-none">✓</span>}
              </div>
              <span className={`text-xs ${cb.checked ? 'text-gray-500 line-through' : 'text-gray-400'} truncate`}>
                {cb.text}
              </span>
            </div>
          ))}
          {checkboxes.length > 3 && (
            <p className="text-xs text-gray-600">+{checkboxes.length - 3} 更多...</p>
          )}
        </div>
      )}

      {/* Run info */}
      {run && (
        <div className="border-t border-gray-800 pt-2 mt-2">
          <p className="text-xs text-gray-600 font-mono truncate">
            {truncateKey(run.childSessionKey, 35)}
          </p>
          <p className="text-xs text-gray-700">
            {run.createdAt ? formatRelativeTime(run.createdAt) : ''}
          </p>
        </div>
      )}
    </div>
  )
}
