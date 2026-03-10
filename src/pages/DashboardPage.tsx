import { useHealth } from '../hooks/useHealth'
import { useSessions } from '../hooks/useSessions'
import { USAGE_POLL_INTERVAL_MS, useUsage } from '../hooks/useUsage'
import { useGatewayContext } from '../hooks/useGateway'
import { GatewayCard } from '../components/dashboard/GatewayCard'
import { AgentOverview } from '../components/dashboard/AgentOverview'
import { UsageSummary } from '../components/dashboard/UsageSummary'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

export function DashboardPage() {
  const { store, connectionState } = useGatewayContext()
  const { data: health, isLoading: healthLoading, error: healthError } = useHealth()
  const { data: sessions } = useSessions()
  const {
    data: usage,
    isLoading: usageLoading,
    error: usageError,
    dataUpdatedAt: usageUpdatedAt,
    isRefetching: isUsageRefetching,
    refetch: refetchUsage,
  } = useUsage()

  const activeGateway = store.gateways.find(g => g.id === store.activeGatewayId)

  if (connectionState === 'disconnected' || connectionState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-5xl">🔌</span>
        <div className="text-center">
          <p className="text-gray-400 dark:text-gray-400 light:text-slate-500 font-medium">无法连接到 Gateway</p>
          <p className="text-sm text-gray-600 dark:text-gray-600 light:text-slate-400 mt-1">
            {connectionState === 'error' ? '连接出错，正在重试...' : '未连接'}
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-700 light:text-slate-500 mt-2 font-mono">
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
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
        <div>
          <h1 className="text-xl font-bold text-white dark:text-white light:text-slate-900">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 light:text-slate-500 mt-0.5">实时监控 OpenClaw Agent 运行状态</p>
        </div>
      </div>

      {/* Error state */}
      {healthError && (
        <div className="bg-red-900/20 dark:bg-red-900/20 light:bg-red-50 border border-red-800 dark:border-red-800 light:border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-400 dark:text-red-400 light:text-red-600">获取 Gateway 状态失败：{String(healthError)}</p>
        </div>
      )}

      {usageError && !usage && (
        <div className="bg-amber-900/20 dark:bg-amber-900/20 light:bg-amber-50 border border-amber-800 dark:border-amber-800 light:border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-300 dark:text-amber-300 light:text-amber-700">
            获取 usage 数据失败：{usageError instanceof Error ? usageError.message : String(usageError)}
          </p>
        </div>
      )}

      {/* Layout: Usage Summary full width, Gateway+Agent stacked in right column */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left: Usage Summary */}
        <div>
          {usageLoading && !usage ? (
            <div className="bg-gray-900 dark:bg-gray-900 light:bg-white border border-gray-800 dark:border-gray-800 light:border-slate-200 rounded-xl p-5">
              <LoadingSpinner message="加载消耗数据..." />
            </div>
          ) : usage ? (
            <UsageSummary
              usage={usage}
              lastUpdated={usageUpdatedAt}
              isRefetching={isUsageRefetching}
              onManualRefresh={() => { void refetchUsage() }}
              autoRefreshInterval={USAGE_POLL_INTERVAL_MS}
              errorMessage={usageError instanceof Error ? usageError.message : undefined}
            />
          ) : (
            <div className="bg-gray-900 dark:bg-gray-900 light:bg-white border border-gray-800 dark:border-gray-800 light:border-slate-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 dark:text-gray-500 light:text-slate-500">暂无 usage 数据</p>
            </div>
          )}
        </div>

        {/* Right column: Gateway + Agent Overview stacked */}
        <div className="space-y-4">
          {/* Gateway Card */}
          {healthLoading && !health ? (
            <div className="bg-gray-900 dark:bg-gray-900 light:bg-white border border-gray-800 dark:border-gray-800 light:border-slate-200 rounded-xl p-5">
              <LoadingSpinner message="加载 Gateway 状态..." />
            </div>
          ) : health ? (
            <GatewayCard
              health={health}
              gatewayLabel={activeGateway?.label || '本机 Gateway'}
            />
          ) : null}

          {/* Agent Overview */}
          {health?.agents && (
            <AgentOverview
              agents={health.agents}
              sessions={sessions?.sessions || []}
            />
          )}
        </div>
      </div>
    </div>
  )
}
