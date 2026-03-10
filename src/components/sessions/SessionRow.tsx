import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionData, useSessionHistory } from '../../hooks/useSessions'
import { RunRecord } from '../../hooks/useFileData'
import { truncateKey, formatRelativeTime, formatTokens, getAgentColor } from '../../lib/utils'
import { MdChevronRight, MdExpandMore, MdOpenInNew } from 'react-icons/md'
import { LoadingSpinner } from '../shared/LoadingSpinner'

interface SessionRowProps {
  session: SessionData
  runs?: RunRecord[]
  depth?: number
  expanded?: boolean
  onToggle?: () => void
}

export function SessionRow({ session, runs = [], depth = 0, expanded = false, onToggle }: SessionRowProps) {
  const navigate = useNavigate()
  const color = getAgentColor(session.agentId || '')
  
  // Fetch session history when expanded
  const { data: historyData, isLoading } = useSessionHistory(
    expanded ? session.key : null
  )

  // Find child runs
  const childRuns = runs.filter(r => r.requesterSessionKey === session.key)

  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50 cursor-pointer transition-colors"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        onClick={onToggle}
      >
        {/* Expand toggle */}
        <div className="w-4 flex-shrink-0">
          {isLoading ? (
            <span className="text-gray-500 text-xs">⏳</span>
          ) : expanded ? (
            <MdExpandMore className="text-gray-500" />
          ) : childRuns.length > 0 ? (
            <MdChevronRight className="text-gray-500" />
          ) : (
            <span className="text-gray-600 text-xs">•</span>
          )}
        </div>

        {/* Agent color bar */}
        <div
          className="w-1 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* Session key */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 font-mono truncate">
            {truncateKey(session.key, 50)}
          </p>
          {session.displayName && (
            <p className="text-xs text-gray-500 truncate">{session.displayName}</p>
          )}
        </div>

        {/* Channel */}
        <div className="w-20 text-center">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
            {session.channel || '-'}
          </span>
        </div>

        {/* Agent */}
        <div className="w-24 text-center">
          <span className="text-xs text-gray-400">{session.agentId || '-'}</span>
        </div>

        {/* Tokens */}
        <div className="w-24 text-right">
          <span className="text-xs text-gray-400">{formatTokens(session.totalTokens || 0)}</span>
        </div>

        {/* Updated at */}
        <div className="w-24 text-right">
          <span className="text-xs text-gray-500">{formatRelativeTime(session.updatedAt)}</span>
        </div>

        {/* Detail */}
        <div className="w-16 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/sessions/${encodeURIComponent(session.key)}`)
            }}
            className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] text-gray-300 hover:border-primary-500 hover:text-white"
            title="查看详情"
          >
            <MdOpenInNew className="text-sm" />
            详情
          </button>
        </div>
      </div>

      {/* Expanded: Session History */}
      {expanded && (
        <SessionHistoryPanel 
          sessionKey={session.key} 
          isLoading={isLoading}
          history={historyData?.messages || []}
        />
      )}

      {/* Child runs */}
      {expanded && childRuns.map(run => (
        <ChildRunRow key={run.runId} run={run} depth={depth + 1} />
      ))}
    </div>
  )
}

interface SessionHistoryPanelProps {
  sessionKey: string
  isLoading: boolean
  history: Array<{
    role: string
    content: string
    timestamp?: number
    model?: string
  }>
}

function SessionHistoryPanel({ isLoading, history }: SessionHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <LoadingSpinner size="sm" message="加载会话历史..." />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-500">
        暂无会话历史消息
      </div>
    )
  }

  return (
    <div className="bg-gray-950/50 border-b border-gray-800/30">
      <div className="px-4 py-2 text-xs text-gray-600 uppercase tracking-wide border-b border-gray-800/30">
        会话历史 ({history.length} 条消息)
      </div>
      <div className="max-h-96 overflow-y-auto">
        {history.map((msg, idx) => (
          <MessageItem key={idx} message={msg} index={idx} total={history.length} />
        ))}
      </div>
    </div>
  )
}

function MessageItem({ message, index, total }: { 
  message: { role: string; content: string; timestamp?: number; model?: string }
  index: number
  total: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isUser = message.role === 'user' || message.role === 'human'
  const isAssistant = message.role === 'assistant' || message.role === 'agent'
  
  const roleColor = isUser ? 'text-blue-400' : isAssistant ? 'text-green-400' : 'text-gray-400'
  const bgClass = isUser ? 'bg-blue-900/10' : isAssistant ? 'bg-green-900/10' : 'bg-gray-800/30'
  
  const timeStr = message.timestamp 
    ? new Date(message.timestamp).toLocaleString('zh-CN', { 
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    : `#${index + 1}`

  const contentPreview = message.content.slice(0, 120)
  const isLong = message.content.length > 120

  return (
    <div className={`px-4 py-3 border-b border-gray-800/20 ${bgClass}`}>
      <div className="flex items-center gap-3 mb-1">
        <span className={`text-xs font-medium ${roleColor}`}>
          {message.role === 'user' ? '👤 用户' : message.role === 'assistant' ? '🤖 助手' : message.role}
        </span>
        {message.model && (
          <span className="text-xs text-gray-600">{message.model}</span>
        )}
        <span className="text-xs text-gray-500 ml-auto">{timeStr}</span>
      </div>
      
      <div 
        className="text-sm text-gray-300 whitespace-pre-wrap break-words cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? message.content : contentPreview}
        {isLong && (
          <span className="text-primary-400 text-xs ml-1">
            {expanded ? ' [收起]' : '... [展开]'}
          </span>
        )}
      </div>
    </div>
  )
}

function ChildRunRow({ run, depth }: { run: RunRecord; depth: number }) {
  const status = run.outcome?.status
  const statusColor = status === 'ok' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-yellow-400'
  const durationMs = run.endedAt && run.startedAt ? run.endedAt - run.startedAt : null

  // Parse child agent from session key
  const childAgentId = run.childSessionKey.split(':')[1] || 'unknown'
  const color = getAgentColor(childAgentId)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-gray-900/50 border-b border-gray-800/30"
      style={{ paddingLeft: `${16 + depth * 24}px` }}
    >
      <div className="w-4 flex-shrink-0" />
      <div
        className="w-1 h-6 rounded-full flex-shrink-0 opacity-60"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-mono truncate">
          ↳ {truncateKey(run.childSessionKey, 45)}
        </p>
        {run.task && (
          <p className="text-xs text-gray-600 truncate mt-0.5">
            {run.task.slice(0, 80)}{run.task.length > 80 ? '…' : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-right">
        <span className={statusColor}>
          {status === 'ok' ? '完成' : status === 'error' ? '失败' : '运行中'}
        </span>
        {durationMs !== null && (
          <span className="text-gray-600">
            {durationMs < 60000
              ? `${Math.round(durationMs / 1000)}s`
              : `${Math.round(durationMs / 60000)}m`}
          </span>
        )}
      </div>
    </div>
  )
}
