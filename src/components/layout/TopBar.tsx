import { useGatewayContext } from '../../hooks/useGateway'
import { useTheme } from '../../hooks/useTheme'
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
  const { theme, toggleTheme } = useTheme()
  const stateInfo = stateLabels[connectionState] ?? { status: 'offline' as const, label: connectionState }
  const activeGateway = store.gateways.find(g => g.id === store.activeGatewayId)

  return (
    <header className="h-14 bg-gray-900 dark:bg-gray-900 light:bg-white border-b border-gray-800 dark:border-gray-800 light:border-slate-200 flex items-center justify-between px-6">
      {/* Gateway selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-500 light:text-slate-500">Gateway:</span>
        <select
          value={store.activeGatewayId}
          onChange={e => setActiveGateway(e.target.value)}
          className="bg-gray-800 dark:bg-gray-800 light:bg-slate-100 text-gray-200 dark:text-gray-200 light:text-slate-700 text-sm rounded-md px-2 py-1 border border-gray-700 dark:border-gray-700 light:border-slate-300 focus:outline-none focus:border-primary"
        >
          {store.gateways.map(g => (
            <option key={g.id} value={g.id}>
              {g.label || g.url}
            </option>
          ))}
        </select>
        {activeGateway && (
          <span className="text-xs text-gray-600 dark:text-gray-600 light:text-slate-400 font-mono">{activeGateway.url}</span>
        )}
      </div>

      {/* Right side: Theme toggle + Connection status */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-slate-100 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-slate-200 transition-colors"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={stateInfo.status} label={stateInfo.label} size="sm" />
        </div>
      </div>
    </header>
  )
}
