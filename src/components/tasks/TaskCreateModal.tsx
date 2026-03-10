import { useState } from 'react'

interface TaskCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

interface CheckboxItem {
  text: string
}

export function TaskCreateModal({ isOpen, onClose, onSuccess }: TaskCreateModalProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [checkboxes, setCheckboxes] = useState<CheckboxItem[]>([])
  const [newCheckbox, setNewCheckbox] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const resp = await fetch('http://127.0.0.1:18902/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          status,
          checkboxes: checkboxes.filter(cb => cb.text.trim()),
        }),
      })

      const data = await resp.json()

      if (!resp.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to create task')
      }

      setTitle('')
      setStatus('todo')
      setCheckboxes([])
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCheckbox = () => {
    if (newCheckbox.trim()) {
      setCheckboxes([...checkboxes, { text: newCheckbox.trim() }])
      setNewCheckbox('')
    }
  }

  const removeCheckbox = (index: number) => {
    setCheckboxes(checkboxes.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Create New Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todo">待处理 (Todo)</option>
              <option value="in_progress">进行中 (In Progress)</option>
              <option value="done">已完成 (Done)</option>
              <option value="blocked">阻塞 (Blocked)</option>
            </select>
          </div>

          {/* Checkboxes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Checkboxes (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCheckbox}
                onChange={e => setNewCheckbox(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckbox())}
                placeholder="Add checkbox item..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addCheckbox}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Add
              </button>
            </div>
            {checkboxes.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {checkboxes.map((cb, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" disabled className="rounded" />
                    <span className="flex-1">{cb.text}</span>
                    <button
                      type="button"
                      onClick={() => removeCheckbox(idx)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${!title.trim() || isSubmitting
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }
              `}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
