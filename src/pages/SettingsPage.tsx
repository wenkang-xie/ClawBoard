import { useState } from 'react'
import { useGatewayContext } from '../hooks/useGateway'
import { GatewayConfig } from '../lib/gateway'
import { StatusBadge } from '../components/shared/StatusBadge'

interface GatewayFormData {
  url: string
  token: string
  label: string
}

export function SettingsPage() {
  const {
    store,
    updateGateway,
    addGateway,
    removeGateway,
    testConnection,
    updateRefreshInterval,
  } = useGatewayContext()

  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGateway, setNewGateway] = useState<GatewayFormData>({ url: '', token: '', label: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GatewayFormData>({ url: '', token: '', label: '' })

  const handleTest = async (config: GatewayConfig) => {
    setTestingId(config.id)
    const ok = await testConnection(config)
    setTestResults(prev => ({ ...prev, [config.id]: ok }))
    setTestingId(null)
  }

  const handleAdd = () => {
    if (!newGateway.url) return
    addGateway({
      url: newGateway.url,
      token: newGateway.token,
      label: newGateway.label || newGateway.url,
    })
    setNewGateway({ url: '', token: '', label: '' })
    setShowAddForm(false)
  }

  const startEdit = (config: GatewayConfig) => {
    setEditingId(config.id)
    setEditForm({ url: config.url, token: config.token, label: config.label || '' })
  }

  const saveEdit = (id: string) => {
    updateGateway({ id, url: editForm.url, token: editForm.token, label: editForm.label })
    setEditingId(null)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Gateway 连接管理与显示设置</p>
      </div>

      {/* Gateway Management */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Gateway 管理</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
          >
            + 添加
          </button>
        </div>

        {/* Gateway list */}
        <div className="space-y-3">
          {store.gateways.map(gateway => (
            <div key={gateway.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              {editingId === gateway.id ? (
                // Edit form
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="显示名称"
                    value={editForm.label}
                    onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="WebSocket URL"
                    value={editForm.url}
                    onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                    className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Auth Token"
                    value={editForm.token}
                    onChange={e => setEditForm(f => ({ ...f, token: e.target.value }))}
                    className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(gateway.id)}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-400 px-3 py-1.5 rounded-md hover:bg-gray-800"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                // Display
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {gateway.label || gateway.url}
                      </span>
                      {store.activeGatewayId === gateway.id && (
                        <span className="text-xs bg-indigo-600/20 text-indigo-400 px-1.5 py-0.5 rounded">
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">{gateway.url}</p>
                    <p className="text-xs text-gray-700 font-mono truncate">
                      {gateway.token ? `${gateway.token.slice(0, 12)}...` : '无 token'}
                    </p>
                    {testResults[gateway.id] !== undefined && (
                      <div className="mt-2">
                        <StatusBadge
                          status={testResults[gateway.id] ? 'online' : 'error'}
                          label={testResults[gateway.id] ? '连接正常' : '连接失败'}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTest(gateway)}
                      disabled={testingId === gateway.id}
                      className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                      {testingId === gateway.id ? '测试中...' : '测试'}
                    </button>
                    <button
                      onClick={() => startEdit(gateway)}
                      className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                      编辑
                    </button>
                    {store.gateways.length > 1 && (
                      <button
                        onClick={() => removeGateway(gateway.id)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mt-3 bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">添加新 Gateway</h3>
            <input
              type="text"
              placeholder="显示名称（如：远程服务器）"
              value={newGateway.label}
              onChange={e => setNewGateway(f => ({ ...f, label: e.target.value }))}
              className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="WebSocket URL（如：wss://example.ts.net）"
              value={newGateway.url}
              onChange={e => setNewGateway(f => ({ ...f, url: e.target.value }))}
              className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <input
              type="text"
              placeholder="Auth Token"
              value={newGateway.token}
              onChange={e => setNewGateway(f => ({ ...f, token: e.target.value }))}
              className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newGateway.url}
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                添加
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-sm text-gray-400 px-4 py-2 rounded-md hover:bg-gray-800"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Refresh interval */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">显示设置</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">数据刷新间隔</p>
              <p className="text-xs text-gray-500 mt-0.5">多久重新拉取一次 Gateway 数据</p>
            </div>
            <select
              value={store.refreshInterval}
              onChange={e => updateRefreshInterval(Number(e.target.value))}
              className="bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500"
            >
              <option value={5000}>5 秒</option>
              <option value={10000}>10 秒</option>
              <option value={30000}>30 秒</option>
              <option value={60000}>1 分钟</option>
            </select>
          </div>
        </div>
      </section>

      {/* Debug Info */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">调试信息</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="space-y-2 text-xs font-mono text-gray-500">
            <p>活跃 Gateway: {store.activeGatewayId}</p>
            <p>刷新间隔: {store.refreshInterval}ms</p>
            <p>Tailscale URL: wss://wenkangdemac-mini.tail7a4e98.ts.net</p>
          </div>
        </div>
      </section>
    </div>
  )
}
