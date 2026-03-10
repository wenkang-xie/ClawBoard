import { HealthData } from '../../hooks/useHealth'
import { StatusBadge } from '../shared/StatusBadge'
import { formatRelativeTime } from '../../lib/utils'

interface GatewayCardProps {
  health: HealthData
  gatewayLabel?: string
}

export function GatewayCard({ health, gatewayLabel = '本机 Gateway' }: GatewayCardProps) {
  const channels = health.channels || {}
  const agents = health.agents || []

  const totalSessions = agents.reduce((sum, a) => sum + (a.sessions?.count ?? 0), 0)

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">{gatewayLabel}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            更新于 {formatRelativeTime(health.ts)}
          </p>
        </div>
        <StatusBadge status={health.ok ? 'online' : 'error'} label={health.ok ? '正常' : '异常'} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{agents.length}</p>
          <p className="text-xs text-gray-500">Agents</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{totalSessions}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{health.durationMs}ms</p>
          <p className="text-xs text-gray-500">响应</p>
        </div>
      </div>

      {/* Channels */}
      <div className="border-t border-gray-800 pt-3 space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Channels</p>
        {Object.entries(channels).map(([name, ch]) => {
          if (!ch) return null
          return (
            <div key={name} className="flex items-center justify-between">
              <span className="text-sm text-gray-400 capitalize">{name}</span>
              <StatusBadge
                status={ch.running ? 'running' : ch.configured ? 'offline' : 'offline'}
                label={ch.running ? '运行中' : ch.configured ? '已配置' : '未配置'}
                size="sm"
              />
            </div>
          )
        })}
        {Object.keys(channels).length === 0 && (
          <p className="text-xs text-gray-600">无 Channel 数据</p>
        )}
      </div>
    </div>
  )
}
