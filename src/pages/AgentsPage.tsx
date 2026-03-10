import { useAgents } from '../hooks/useAgents'
import { useSessions } from '../hooks/useSessions'
import { AgentCard } from '../components/agents/AgentCard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { EmptyState } from '../components/shared/EmptyState'

export function AgentsPage() {
  const { data: agentsData, isLoading, error } = useAgents()
  const { data: sessionsData } = useSessions()

  if (isLoading) {
    return <LoadingSpinner size="lg" message="加载 Agents..." />
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-400">获取 Agent 列表失败：{String(error)}</p>
      </div>
    )
  }

  const agents = agentsData?.agents || []
  const sessions = sessionsData?.sessions || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full" />
        <div>
          <h1 className="text-xl font-bold text-white">Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {agents.length} 个 Agent · 点击卡片查看 Sessions
          </p>
        </div>
      </div>

      {agents.length === 0 ? (
        <EmptyState icon="🤖" title="没有 Agent 数据" description="连接 Gateway 后自动加载" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              sessions={sessions}
            />
          ))}
        </div>
      )}
    </div>
  )
}
