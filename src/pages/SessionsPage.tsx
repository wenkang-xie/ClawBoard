import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useRunsJson } from '../hooks/useFileData'
import { SessionList } from '../components/sessions/SessionList'
import { SessionTree } from '../components/sessions/SessionTree'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

type View = 'list' | 'tree'

export function SessionsPage() {
  const [searchParams] = useSearchParams()
  const defaultAgent = searchParams.get('agent') || ''
  const [view, setView] = useState<View>('list')

  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useSessions()
  const { data: runsData } = useRunsJson()

  const sessions = sessionsData?.sessions || []
  const runs = runsData ? Object.values(runsData.runs) : []

  if (sessionsLoading) {
    return <LoadingSpinner size="lg" message="加载 Sessions..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sessionsData?.count ?? 0} 个 Sessions
            {defaultAgent && ` · 过滤: ${defaultAgent}`}
            {' · 行内可展开历史，右侧可进详情页'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* View toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              view === 'list'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            列表
          </button>
          <button
            onClick={() => setView('tree')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              view === 'tree'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            流转树
          </button>
        </div>
      </div>

      {sessionsError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-400">获取 Session 列表失败：{String(sessionsError)}</p>
        </div>
      )}

      {view === 'list' ? (
        <SessionList
          sessions={sessions}
          runs={runs}
          defaultAgentFilter={defaultAgent}
        />
      ) : (
        <SessionTree runs={runs} sessions={sessions} />
      )}
    </div>
  )
}
