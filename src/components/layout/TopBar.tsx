import { useGatewayContext } from '../../hooks/useGateway'
import { StatusBadge } from '../shared/StatusBadge'

const stateLabels: Record<string, { status: 'online' | 'offline' | 'warning' | 'running'; label: string }> = {
  ready: { status: 'online', label: '已连接' },
  connecting: { status: 'running', label: '连接中...' },
  authenticating: { status: 'running', label: '认证中...' },
  disconnected: { status: 'offline', label: '未连接' },
  error: { status: 'warning', label: '连接错误' },
}

export function TopBar() {
  const { store, connectionState, setActiveGateway } = useGatewayContext()
  const stateInfo = stateLabels[connectionState] ?? { status: 'offline' as const, label: connectionState }
  const activeGateway = store.gateways.find(g => g.id === store.activeGatewayId)

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      {/* Gateway selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Gateway:</span>
        <select
          value={store.activeGatewayId}
          onChange={e => setActiveGateway(e.target.value)}
          className="bg-gray-800 text-gray-200 text-sm rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:border-indigo-500"
        >
          {store.gateways.map(g => (
            <option key={g.id} value={g.id}>
              {g.label || g.url}
            </option>
          ))}
        </select>
        {activeGateway && (
          <span className="text-xs text-gray-600 font-mono">{activeGateway.url}</span>
        )}
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <StatusBadge status={stateInfo.status} label={stateInfo.label} size="sm" />
      </div>
    </header>
  )
}
