import { type FormEvent, useMemo, useState } from 'react'

const BFF_BASE = 'http://127.0.0.1:18902'

interface TaskCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
type TaskPriority = 'P0' | 'P1' | 'P2'

const ownerOptions = ['main', 'architect', 'research', 'designer']

export function TaskCreateModal({ isOpen, onClose, onSuccess }: TaskCreateModalProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [ownerAgent, setOwnerAgent] = useState('main')
  const [priority, setPriority] = useState<TaskPriority>('P1')
  const [tagsText, setTagsText] = useState('#agent-dashboard #tasks')
  const [checklistText, setChecklistText] = useState('')
  const [due, setDue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checklist = useMemo(
    () => checklistText.split('\n').map(item => item.trim()).filter(Boolean),
    [checklistText]
  )

  const reset = () => {
    setTitle('')
    setStatus('todo')
    setOwnerAgent('main')
    setPriority('P1')
    setTagsText('#agent-dashboard #tasks')
    setChecklistText('')
    setDue('')
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const resp = await fetch(`${BFF_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          status,
          ownerAgent,
          priority,
          tags: tagsText,
          due: due.trim() || undefined,
          checkboxes: checklist,
          inputs: ['Dashboard UI 创建'],
          deliverables: ['写入 running_tasks.md 并回显到 Tasks 看板'],
        }),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || !data.ok) {
        throw new Error(data?.error?.message || '创建任务失败')
      }

      onSuccess()
      reset()
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '创建任务失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />

      <div className="relative w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">新建文档任务</h2>
            <p className="mt-1 text-xs text-gray-500">
              提交后会写入 <code>~/.openclaw/workspace/tasks/running_tasks.md</code>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            关闭
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">标题</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：Sprint4 多 Agent memory 联调"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Owner-Agent</label>
              <select
                value={ownerAgent}
                onChange={e => setOwnerAgent(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
              >
                {ownerOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="todo">todo</option>
                <option value="in_progress">in_progress</option>
                <option value="blocked">blocked</option>
                <option value="done">done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Tags</label>
              <input
                value={tagsText}
                onChange={e => setTagsText(e.target.value)}
                placeholder="#agent-dashboard #sprint4"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Due（可选）</label>
              <input
                value={due}
                onChange={e => setDue(e.target.value)}
                placeholder="2026-03-11 18:00"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Checklist（每行一个，可选）</label>
            <textarea
              value={checklistText}
              onChange={e => setChecklistText(e.target.value)}
              rows={5}
              placeholder={'补 BFF 接口\n补前端接线\n自测 build'}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
            />
            {checklist.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">将创建 {checklist.length} 条 checklist</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {isSubmitting ? '创建中...' : '写入 running_tasks.md'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
