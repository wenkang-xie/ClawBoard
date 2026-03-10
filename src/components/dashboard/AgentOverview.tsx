import { AgentHealth } from '../../hooks/useHealth'
import { SessionData } from '../../hooks/useSessions'
import { getAgentColor, formatRelativeTime } from '../../lib/utils'

interface AgentOverviewProps {
  agents: AgentHealth[]
  sessions: SessionData[]
}

const agentEmojis: Record<string, string> = {
  main: '🌸',
  architect: '🏗️',
  research: '🔎',
  codex: '💻',
}

const agentNames: Record<string, string> = {
  main: 'Hikari',
  architect: 'Kiseki',
  research: 'Umi',
}

export function AgentOverview({ agents, sessions }: AgentOverviewProps) {
  const getRecentSession = (agentId: string) => {
    return sessions
      .filter(s => s.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  const getActiveSessionCount = (agentId: string) => {
    const cutoff = Date.now() - 3_600_000 // last hour
    return sessions.filter(s => s.agentId === agentId && s.updatedAt > cutoff).length
  }

  return (
    <div className="bg-gray-900/80 dark:bg-gray-900/80 light:bg-white border border-gray-800 dark:border-gray-800 light:border-slate-200 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white dark:text-white light:text-slate-900 mb-4">Agent 快览</h3>
      <div className="space-y-3">
        {agents.map(agent => {
          const recentSession = getRecentSession(agent.agentId)
          const activeCount = getActiveSessionCount(agent.agentId)
          const color = getAgentColor(agent.agentId)
          const emoji = agentEmojis[agent.agentId] || '🤖'
          const name = agentNames[agent.agentId] || agent.agentId

          return (
            <div
              key={agent.agentId}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 dark:bg-gray-800/50 light:bg-slate-50 hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-slate-100 transition-colors"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
              >
                {emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white dark:text-white light:text-slate-900">{name}</span>
                  {activeCount > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                      {activeCount} 活跃
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">
                  {agent.sessions?.count ?? 0} sessions
                  {recentSession && ` · 最近 ${formatRelativeTime(recentSession.updatedAt)}`}
                </p>
              </div>

              {/* Total sessions count */}
              <div className="text-right">
                <p className="text-lg font-semibold text-white dark:text-white light:text-slate-900">{agent.sessions?.count ?? 0}</p>
              </div>
            </div>
          )
        })}
        {agents.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-600 light:text-slate-500 text-center py-4">暂无 Agent 数据</p>
        )}
      </div>
    </div>
  )
}
