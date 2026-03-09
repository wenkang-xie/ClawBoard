import { useHealth } from '../hooks/useHealth'
import { useSessions } from '../hooks/useSessions'
import { useUsage } from '../hooks/useUsage'
import { useGatewayContext } from '../hooks/useGateway'
import { GatewayCard } from '../components/dashboard/GatewayCard'
import { AgentOverview } from '../components/dashboard/AgentOverview'
import { UsageSummary } from '../components/dashboard/UsageSummary'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

export function DashboardPage() {
  const { store, connectionState } = useGatewayContext()
  const { data: health, isLoading: healthLoading, error: healthError } = useHealth()
  const { data: sessions } = useSessions()
  const { data: usage, isLoading: usageLoading } = useUsage()

  const activeGateway = store.gateways.find(g => g.id === store.activeGatewayId)

  if (connectionState === 'disconnected' || connectionState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-5xl">🔌</span>
        <div className="text-center">
          <p className="text-gray-400 font-medium">无法连接到 Gateway</p>
          <p className="text-sm text-gray-600 mt-1">
            {connectionState === 'error' ? '连接出错，正在重试...' : '未连接'}
          </p>
          <p className="text-xs text-gray-700 mt-2 font-mono">
            {activeGateway?.url}
          </p>
        </div>
      </div>
    )
  }

  if (connectionState === 'connecting' || connectionState === 'authenticating') {
    return <LoadingSpinner size="lg" message="正在连接 Gateway..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">实时监控 OpenClaw Agent 运行状态</p>
      </div>

      {/* Error state */}
      {healthError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-400">获取 Gateway 状态失败：{String(healthError)}</p>
        </div>
      )}

      {/* Gateway Cards */}
      {healthLoading && !health ? (
        <LoadingSpinner message="加载 Gateway 状态..." />
      ) : health ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <GatewayCard
            health={health}
            gatewayLabel={activeGateway?.label || '本机 Gateway'}
          />
        </div>
      ) : null}

      {/* Two-column grid: Agent Overview + Usage */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {health?.agents && (
          <AgentOverview
            agents={health.agents}
            sessions={sessions?.sessions || []}
          />
        )}

        {usageLoading && !usage ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <LoadingSpinner message="加载消耗数据..." />
          </div>
        ) : usage ? (
          <UsageSummary usage={usage} />
        ) : null}
      </div>
    </div>
  )
}
