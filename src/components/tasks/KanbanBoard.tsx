import { useMemo } from 'react'
import { RunRecord } from '../../hooks/useFileData'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { EmptyState } from '../shared/EmptyState'

interface ParsedMdTask {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  checkboxes: { text: string; checked: boolean }[]
  rawText: string
}

function parseRunningTasksMd(md: string): ParsedMdTask[] {
  const tasks: ParsedMdTask[] = []
  
  // Split by ## headers (TASK sections)
  const sections = md.split(/(?=^##\s)/m).filter(s => s.trim())
  
  for (const section of sections) {
    const lines = section.split('\n')
    const headerLine = lines[0] || ''
    const match = headerLine.match(/^##\s+(.+)/)
    if (!match) continue
    
    const title = match[1].trim()
    const id = `md-${title.replace(/\s+/g, '-').toLowerCase()}`
    
    // Parse checkboxes
    const checkboxes: { text: string; checked: boolean }[] = []
    for (const line of lines) {
      const cbMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)/)
      if (cbMatch) {
        checkboxes.push({
          checked: cbMatch[1] !== ' ',
          text: cbMatch[2].trim(),
        })
      }
    }
    
    // Determine status from content
    let status: ParsedMdTask['status'] = 'todo'
    const sectionLower = section.toLowerCase()
    if (sectionLower.includes('**状态**: blocked') || sectionLower.includes('blocked')) {
      status = 'blocked'
    } else if (sectionLower.includes('**状态**: running') || sectionLower.includes('running')) {
      status = 'in_progress'
    } else if (sectionLower.includes('**状态**: done') || sectionLower.includes('done')) {
      status = 'done'
    } else if (checkboxes.length > 0) {
      const checkedCount = checkboxes.filter(c => c.checked).length
      if (checkedCount === checkboxes.length) status = 'done'
      else if (checkedCount > 0) status = 'in_progress'
      else status = 'todo'
    }
    
    tasks.push({ id, title, status, checkboxes, rawText: section })
  }
  
  return tasks
}

interface KanbanBoardProps {
  runs: Record<string, RunRecord>
  tasksMd?: string
}

export function KanbanBoard({ runs, tasksMd }: KanbanBoardProps) {
  const runList = useMemo(() => Object.values(runs), [runs])
  const mdTasks = useMemo(() => tasksMd ? parseRunningTasksMd(tasksMd) : [], [tasksMd])

  // Categorize runs
  const inProgress = runList.filter(r => !r.outcome || r.outcome.status === null)
  const done = runList.filter(r => r.outcome?.status === 'ok')
  const blocked = runList.filter(r => r.outcome?.status === 'error')
  
  // Categorize md tasks
  const mdTodo = mdTasks.filter(t => t.status === 'todo')
  const mdInProgress = mdTasks.filter(t => t.status === 'in_progress')
  const mdDone = mdTasks.filter(t => t.status === 'done')
  const mdBlocked = mdTasks.filter(t => t.status === 'blocked')

  const totalTasks = runList.length + mdTasks.length
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
        count={mdTodo.length}
        color="bg-gray-400"
      >
        {mdTodo.map(task => (
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
        count={inProgress.length + mdInProgress.length}
        color="bg-blue-400"
      >
        {mdInProgress.map(task => (
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
        count={done.length + mdDone.length}
        color="bg-green-400"
      >
        {mdDone.map(task => (
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
        count={blocked.length + mdBlocked.length}
        color="bg-red-400"
      >
        {mdBlocked.map(task => (
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
