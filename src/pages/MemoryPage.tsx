import { useEffect, useMemo, useState } from 'react'
import { V1MemoryCategory, V1MemoryFileNode, useMemoryAgents, useMemoryList, useMemoryPreview } from '../hooks/useMemory'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { EmptyState } from '../components/shared/EmptyState'
import { MemoryStateBanner } from '../components/memory/MemoryStateBanner'
import { MemoryIndexPanel } from '../components/memory/MemoryIndexPanel'
import { MemoryPreviewPanel } from '../components/memory/MemoryPreviewPanel'
import { AgentSelector } from '../components/memory/AgentSelector'

function formatRefreshTime(ts?: number) {
  if (!ts) return '--'
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function MemoryPage() {
  const [selectedAgentId, setSelectedAgentId] = useState('main')
  const [searchText, setSearchText] = useState('')
  const [category, setCategory] = useState<V1MemoryCategory | 'all'>('all')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const agentsQuery = useMemoryAgents()

  useEffect(() => {
    const defaultAgentId = agentsQuery.data?.defaultAgentId || 'main'
    const availableAgents = agentsQuery.data?.agents || []
    if (!availableAgents.some(agent => agent.agentId === selectedAgentId)) {
      setSelectedAgentId(defaultAgentId)
    }
  }, [agentsQuery.data, selectedAgentId])

  const selectedAgent = useMemo(
    () => agentsQuery.data?.agents.find(agent => agent.agentId === selectedAgentId) || agentsQuery.data?.agents[0],
    [agentsQuery.data, selectedAgentId]
  )

  const memoryQuery = useMemoryList('modified', undefined, selectedAgentId)
  const files = memoryQuery.data?.files || []

  const filteredFiles = useMemo(() => {
    const q = searchText.trim().toLowerCase()

    return files.filter(file => {
      if (category !== 'all' && file.category !== category) return false
      if (!q) return true

      const tagText = file.tags.join(' ').toLowerCase()
      return (
        file.name.toLowerCase().includes(q)
        || file.relativePath.toLowerCase().includes(q)
        || tagText.includes(q)
      )
    })
  }, [files, searchText, category])

  useEffect(() => {
    if (filteredFiles.length === 0) {
      setSelectedPath(null)
      return
    }

    if (!selectedPath || !filteredFiles.some(item => item.path === selectedPath)) {
      setSelectedPath(filteredFiles[0].path)
    }
  }, [filteredFiles, selectedPath])

  const selectedFile: V1MemoryFileNode | null = useMemo(
    () => files.find(item => item.path === selectedPath) || null,
    [files, selectedPath]
  )

  const previewPath = selectedFile?.previewable ? selectedPath : null
  const previewQuery = useMemoryPreview(previewPath, selectedAgentId)

  const loadingCore = (agentsQuery.isLoading && !agentsQuery.data) || (memoryQuery.isLoading && files.length === 0)
  const noData = !loadingCore && files.length === 0
  const agentsError = agentsQuery.error ? String(agentsQuery.error) : ''
  const indexError = memoryQuery.error ? String(memoryQuery.error) : ''
  const warnings = [
    ...(selectedAgent?.warnings || []),
    ...(memoryQuery.data?.warnings || []),
  ]
  const isPartial = Boolean(warnings.length > 0 || memoryQuery.data?.partial)
  const isStale = memoryQuery.isStale

  const refreshAll = () => {
    void agentsQuery.refetch()
    void memoryQuery.refetch()
    void previewQuery.refetch()
  }

  if (loadingCore) {
    return <LoadingSpinner size="lg" message="加载 Memory 索引..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Memory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            多 Agent 记忆索引 + 预览区 · 当前 {selectedAgent?.label || selectedAgentId} · {files.length} 个文件 · 上次刷新 {formatRefreshTime(memoryQuery.dataUpdatedAt ?? undefined)}
          </p>
        </div>
        <div className="flex items-start gap-3 flex-wrap">
          <AgentSelector
            agents={agentsQuery.data?.agents || []}
            selectedAgentId={selectedAgentId}
            onAgentChange={setSelectedAgentId}
            loading={agentsQuery.isLoading}
          />
          <button
            type="button"
            onClick={refreshAll}
            className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {agentsError && (
        <MemoryStateBanner
          type="error"
          title="Memory Agent 列表加载失败"
          description={agentsError}
          action={(
            <button
              type="button"
              onClick={refreshAll}
              className="rounded border border-red-800 px-2 py-1 text-xs text-red-200 hover:bg-red-900/30"
            >
              重试
            </button>
          )}
        />
      )}

      {indexError && (
        <MemoryStateBanner
          type="error"
          title="Memory 索引加载失败"
          description={indexError}
          action={(
            <button
              type="button"
              onClick={refreshAll}
              className="rounded border border-red-800 px-2 py-1 text-xs text-red-200 hover:bg-red-900/30"
            >
              重试
            </button>
          )}
        />
      )}

      {!indexError && isStale && (
        <MemoryStateBanner
          type="stale"
          title="当前展示的是缓存数据"
          description="Memory 索引可能已过期，可手动刷新获取最新文件列表。"
          action={(
            <button
              type="button"
              onClick={refreshAll}
              className="rounded border border-yellow-700 px-2 py-1 text-xs text-yellow-100 hover:bg-yellow-900/30"
            >
              立即刷新
            </button>
          )}
        />
      )}

      {!indexError && isPartial && (
        <MemoryStateBanner
          type="partial"
          title="当前 Agent 的 Memory 来源存在降级信息"
          description={warnings[0] || '至少有一个目录/索引/sqlite 缺失，当前先展示可访问部分。'}
        />
      )}

      {!indexError && previewQuery.error && (
        <MemoryStateBanner
          type="partial"
          title="文件预览不完整"
          description={`已拿到索引，但预览读取失败：${String(previewQuery.error)}`}
        />
      )}

      {noData ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <EmptyState
            icon="🗂️"
            title="当前 Agent 暂无 Memory 文件"
            description={`agent=${selectedAgentId}，当前没有可展示文件，或对应 workspace/memory 目录不可访问。`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <MemoryIndexPanel
            files={filteredFiles}
            selectedPath={selectedPath}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            category={category}
            onCategoryChange={setCategory}
            onSelect={setSelectedPath}
            totalCount={files.length}
          />

          <MemoryPreviewPanel
            selectedFile={selectedFile}
            preview={previewQuery.data}
            previewLoading={previewQuery.isLoading}
            previewError={previewQuery.error ? String(previewQuery.error) : undefined}
            isPreviewStale={previewQuery.isStale}
            onRetry={() => void previewQuery.refetch()}
          />
        </div>
      )}
    </div>
  )
}
