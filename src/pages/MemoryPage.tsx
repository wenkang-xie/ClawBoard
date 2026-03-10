import { useEffect, useMemo, useState } from 'react'
import { V1MemoryCategory, V1MemoryFileNode, useMemoryList, useMemoryPreview, useAgentsList } from '../hooks/useMemory'
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
  const [searchText, setSearchText] = useState('')
  const [category, setCategory] = useState<V1MemoryCategory | 'all'>('all')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Fetch agents list (for selector)
  const agentsQuery = useAgentsList()

  // Fetch memory list with agent selection
  const memoryQuery = useMemoryList('modified', category === 'all' ? undefined : category, selectedAgentId)
  const files = memoryQuery.data?.files || []

  // Show agent-specific warning if applicable
  const agentWarning = memoryQuery.data?.warnings?.[0]

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

  // Only request preview for previewable files
  const previewPath = selectedFile?.previewable ? selectedPath : null
  const previewQuery = useMemoryPreview(previewPath)

  const loadingCore = memoryQuery.isLoading && files.length === 0
  const noData = !loadingCore && files.length === 0
  const indexError = memoryQuery.error ? String(memoryQuery.error) : ''
  const isPartial = Boolean(memoryQuery.data?.partial)
  const isStale = memoryQuery.isStale

  const refreshAll = () => {
    void memoryQuery.refetch()
    void previewQuery.refetch()
    void agentsQuery.refetch()
  }

  if (loadingCore) {
    return <LoadingSpinner size="lg" message="加载 Memory 索引..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Memory</h1>
            <p className="text-sm text-gray-500 mt-1">
              记忆文件索引 + 预览区 · {files.length} 个文件 · 上次刷新 {formatRefreshTime(memoryQuery.dataUpdatedAt ?? undefined)}
            </p>
          </div>
          
          {/* Agent Selector */}
          <AgentSelector
            selectedAgentId={selectedAgentId}
            onAgentChange={setSelectedAgentId}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
          >
            刷新
          </button>
        </div>
      </div>

      {/* Agent context banner */}
      {selectedAgentId && !indexError && (
        <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg px-3 py-2 text-sm text-indigo-300">
          当前查看 Agent <span className="font-medium">{selectedAgentId}</span> 的 Memory
          {memoryQuery.data?.source && (
            <span className="text-gray-500 ml-2">({memoryQuery.data.source})</span>
          )}
        </div>
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

      {/* Agent fallback warning */}
      {!indexError && agentWarning && (
        <MemoryStateBanner
          type="partial"
          title="Agent Memory 降级"
          description={agentWarning}
        />
      )}

      {!indexError && isPartial && (
        <MemoryStateBanner
          type="partial"
          title="部分目录暂不可用"
          description={memoryQuery.data?.warnings?.[0] || '至少有一个目录读取失败，当前先展示可访问部分。'}
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
            title={selectedAgentId ? `Agent "${selectedAgentId}" Memory 目录为空` : "Memory 目录为空"} 
            description={selectedAgentId 
              ? "该 Agent 没有 Memory 文件或目录权限不足" 
              : "当前没有可展示的 .md 文件，或目录权限不足。"
            } 
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
