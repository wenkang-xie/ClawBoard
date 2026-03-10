import { useNavigate } from 'react-router-dom'
import { AgentData } from '../../hooks/useAgents'
import { SessionData } from '../../hooks/useSessions'
import { getAgentColor, formatRelativeTime, formatTokens } from '../../lib/utils'
import { StatusBadge } from '../shared/StatusBadge'

interface AgentCardProps {
  agent: AgentData
  sessions: SessionData[]
}

export function AgentCard({ agent, sessions: allSessions }: AgentCardProps) {
  const navigate = useNavigate()
  const color = getAgentColor(agent.id)

  const agentSessions = allSessions.filter(s => s.agentId === agent.id)
  const recentSession = agentSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const activeSessions = agentSessions.filter(s => s.updatedAt > Date.now() - 3_600_000)
  const totalTokens = agentSessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0)

  const isActive = activeSessions.length > 0

  return (
    <div
      className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 cursor-pointer card-hover group"
      onClick={() => navigate(`/sessions?agent=${agent.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
          >
            {agent.identity?.emoji || '🤖'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {agent.identity?.name || agent.id}
            </h3>
            <p className="text-xs text-gray-500 capitalize">{agent.id}</p>
          </div>
        </div>
        <StatusBadge
          status={isActive ? 'running' : 'offline'}
          label={isActive ? '活跃' : '空闲'}
          size="sm"
        />
      </div>

      {/* Theme */}
      {agent.identity?.theme && (
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
          {agent.identity.theme}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-gray-800/50 rounded-lg py-2">
          <p className="text-xl font-bold text-white">{agentSessions.length}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
        <div className="text-center bg-gray-800/50 rounded-lg py-2">
          <p className="text-xl font-bold text-primary-400">{activeSessions.length}</p>
          <p className="text-xs text-gray-500">近1小时</p>
        </div>
        <div className="text-center bg-gray-800/50 rounded-lg py-2">
          <p className="text-xl font-bold text-green-400">{formatTokens(totalTokens)}</p>
          <p className="text-xs text-gray-500">Tokens</p>
        </div>
      </div>

      {/* Recent session */}
      {recentSession && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-600 mb-1">最近 Session</p>
          <p className="text-xs text-gray-400 truncate">
            {recentSession.displayName || recentSession.key}
          </p>
          <p className="text-xs text-gray-600">{formatRelativeTime(recentSession.updatedAt)}</p>
        </div>
      )}

      {/* Arrow indicator */}
      <div className="flex justify-end mt-3">
        <span className="text-xs text-gray-600 group-hover:text-primary-400 transition-colors">
          查看 Sessions →
        </span>
      </div>
    </div>
  )
}
