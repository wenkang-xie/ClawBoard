import { useState, useMemo } from 'react'
import { SessionData, useSessionHistory } from '../../hooks/useSessions'
import { RunRecord } from '../../hooks/useFileData'
import { SessionRow } from './SessionRow'
import { EmptyState } from '../shared/EmptyState'

interface SessionListProps {
  sessions: SessionData[]
  runs?: RunRecord[]
  defaultAgentFilter?: string
}

export function SessionList({ sessions, runs = [], defaultAgentFilter }: SessionListProps) {
  const [agentFilter, setAgentFilter] = useState(defaultAgentFilter || '')
  const [channelFilter, setChannelFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null)

  // Get unique agents and channels for filters
  const agents = useMemo(() => {
    const ids = new Set(sessions.map(s => s.agentId || 'unknown'))
    return Array.from(ids).sort()
  }, [sessions])

  const channels = useMemo(() => {
    const chs = new Set(sessions.map(s => s.channel || '').filter(Boolean))
    return Array.from(chs).sort()
  }, [sessions])

  // Filtered sessions
  const filtered = useMemo(() => {
    let result = [...sessions]
    if (agentFilter) result = result.filter(s => s.agentId === agentFilter)
    if (channelFilter) result = result.filter(s => s.channel === channelFilter)
    if (searchText) {
      const q = searchText.toLowerCase()
      result = result.filter(s =>
        s.key.toLowerCase().includes(q) ||
        (s.displayName || '').toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [sessions, agentFilter, channelFilter, searchText])

  const handleSessionClick = (sessionKey: string) => {
    setExpandedSessionKey(prev => prev === sessionKey ? null : sessionKey)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 flex-wrap">
        <input
          type="text"
          placeholder="搜索 session..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="flex-1 min-w-48 bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-primary-500 placeholder-gray-600"
        />
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="bg-gray-800 text-gray-200 text-sm rounded-md px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-primary-500"
        >
          <option value="">所有 Agent</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="bg-gray-800 text-gray-200 text-sm rounded-md px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-primary-500"
        >
          <option value="">所有 Channel</option>
          {channels.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} / {sessions.length}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wide">
        <div className="w-4" />
        <div className="w-1" />
        <div className="flex-1">Session Key</div>
        <div className="w-20 text-center">Channel</div>
        <div className="w-24 text-center">Agent</div>
        <div className="w-24 text-right">Tokens</div>
        <div className="w-24 text-right">更新时间</div>
        <div className="w-16 text-right">详情</div>
      </div>

      {/* Rows */}
      <div>
        {filtered.length === 0 ? (
          <EmptyState icon="📋" title="没有匹配的 Session" description="尝试调整过滤条件" />
        ) : (
          filtered.map(session => (
            <SessionRow
              key={session.key}
              session={session}
              runs={runs}
              expanded={expandedSessionKey === session.key}
              onToggle={() => handleSessionClick(session.key)}
            />
          ))
        )}
      </div>
    </div>
  )
}
