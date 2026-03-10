import { useMemo } from 'react'
import { BffTask, RunRecord } from '../../hooks/useFileData'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { EmptyState } from '../shared/EmptyState'

interface KanbanBoardProps {
  runs: Record<string, RunRecord>
  tasks?: BffTask[]
}

export function KanbanBoard({ runs, tasks = [] }: KanbanBoardProps) {
  const runList = useMemo(() => Object.values(runs), [runs])
  const parsedTasks = useMemo(() => tasks, [tasks])

  // Categorize runs
  const inProgress = runList.filter(r => !r.outcome || r.outcome.status === null)
  const done = runList.filter(r => r.outcome?.status === 'ok')
  const blocked = runList.filter(r => r.outcome?.status === 'error')
  
  // Categorize tasks
  const taskTodo = parsedTasks.filter(t => t.status === 'todo')
  const taskInProgress = parsedTasks.filter(t => t.status === 'in_progress')
  const taskDone = parsedTasks.filter(t => t.status === 'done')
  const taskBlocked = parsedTasks.filter(t => t.status === 'blocked')

  const totalTasks = runList.length + parsedTasks.length
  if (totalTasks === 0) {
    return (
      <EmptyState
        icon="📋"
        title="暂无任务数据"
        description="需要 runs.json 或 running_tasks.md 数据"
      />
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {/* Todo (MD only) */}
      <KanbanColumn
        title="待处理"
        count={taskTodo.length}
        color="bg-gray-400"
      >
        {taskTodo.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            status="todo"
            checkboxes={task.checkboxes}
          />
        ))}
      </KanbanColumn>

      {/* In Progress */}
      <KanbanColumn
        title="进行中"
        count={inProgress.length + taskInProgress.length}
        color="bg-blue-400"
      >
        {taskInProgress.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            status="in_progress"
            checkboxes={task.checkboxes}
          />
        ))}
        {inProgress.map(run => (
          <TaskCard key={run.runId} run={run} />
        ))}
      </KanbanColumn>

      {/* Done */}
      <KanbanColumn
        title="已完成"
        count={done.length + taskDone.length}
        color="bg-green-400"
      >
        {taskDone.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            status="done"
            checkboxes={task.checkboxes}
          />
        ))}
        {done.slice(0, 10).map(run => (
          <TaskCard key={run.runId} run={run} />
        ))}
        {done.length > 10 && (
          <p className="text-xs text-gray-600 text-center py-2">
            +{done.length - 10} 更多已完成任务
          </p>
        )}
      </KanbanColumn>

      {/* Blocked */}
      <KanbanColumn
        title="失败/阻塞"
        count={blocked.length + taskBlocked.length}
        color="bg-red-400"
      >
        {taskBlocked.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            status="blocked"
            checkboxes={task.checkboxes}
          />
        ))}
        {blocked.map(run => (
          <TaskCard key={run.runId} run={run} />
        ))}
      </KanbanColumn>
    </div>
  )
}
