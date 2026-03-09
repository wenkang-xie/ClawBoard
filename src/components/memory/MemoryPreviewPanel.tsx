import { V1MemoryFileNode, V1MemoryFileDetail } from '../../hooks/useMemory'
import { EmptyState } from '../shared/EmptyState'
import { LoadingSpinner } from '../shared/LoadingSpinner'

interface MemoryPreviewPanelProps {
  selectedFile: V1MemoryFileNode | null
  preview: V1MemoryFileDetail | undefined
  previewLoading: boolean
  previewError?: string
  isPreviewStale?: boolean
  onRetry: () => void
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MemoryPreviewPanel({
  selectedFile,
  preview,
  previewLoading,
  previewError,
  isPreviewStale,
  onRetry,
}: MemoryPreviewPanelProps) {
  if (!selectedFile) {
    return (
      <section className="bg-gray-900 border border-gray-800 rounded-xl">
        <EmptyState icon="🧠" title="选择左侧 Memory 文件" description="这里会展示文件预览、标签、更新时间和段落结构" />
      </section>
    )
  }

  if (!selectedFile.previewable) {
    return (
      <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{selectedFile.name}</h2>
          <p className="text-xs text-gray-500 mt-1 truncate">{selectedFile.relativePath}</p>
        </div>
        <EmptyState icon="🔒" title="文件不支持预览" description={`${selectedFile.ext || '该文件类型'} 不在可预览范围 (.md / .txt / .json / .jsonl)`} />
      </section>
    )
  }

  if (previewLoading && !preview) {
    return (
      <section className="bg-gray-900 border border-gray-800 rounded-xl">
        <LoadingSpinner message="加载文件预览..." />
      </section>
    )
  }

  if (previewError && !preview) {
    return (
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <p className="text-sm text-red-300">读取预览失败：{previewError}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-red-800 px-2 py-1 text-xs text-red-200 hover:bg-red-900/30"
        >
          重试
        </button>
      </section>
    )
  }

  const headingsFallback: { level: number; text: string }[] = []
  const meta = preview || {
    ...selectedFile,
    ext: selectedFile.ext,
    lineCount: 0,
    truncated: false,
    preview: '',
    headings: headingsFallback,
    tags: [] as string[],
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-white">{meta.name}</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-300">{selectedFile.category}</span>
          {isPreviewStale && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-200">stale</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{meta.relativePath}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px]">
          <div className="rounded bg-gray-800/60 p-2 text-gray-400">更新: {formatDate(meta.modifiedAt)}</div>
          <div className="rounded bg-gray-800/60 p-2 text-gray-400">大小: {formatBytes(meta.sizeBytes)}</div>
          <div className="rounded bg-gray-800/60 p-2 text-gray-400">行数: {meta.lineCount}</div>
          <div className="rounded bg-gray-800/60 p-2 text-gray-400">标签: {(meta.tags || selectedFile.tags).length}</div>
        </div>

        <div className="mt-2 flex gap-1.5 flex-wrap">
          {(meta.tags?.length ? meta.tags : selectedFile.tags).slice(0, 10).map(tag => (
            <span key={`${meta.path}-${tag}`} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-4">
        <div className="bg-gray-950/70 border border-gray-800 rounded-lg p-3 h-fit">
          <p className="text-xs text-gray-500 uppercase tracking-wide">文档结构</p>
          <div className="mt-2 space-y-1 max-h-64 overflow-auto">
            {(meta.headings ?? []).length === 0 ? (
              <p className="text-xs text-gray-600">暂无标题结构</p>
            ) : (
              (meta.headings ?? []).map((heading, idx) => (
                <p
                  key={`${heading.text}-${idx}`}
                  className="text-xs text-gray-400 truncate"
                  style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 8}px` }}
                >
                  {heading.text}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-3 max-h-[62vh] overflow-auto">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
            {meta.preview || '（当前文件暂无可预览内容）'}
          </pre>
          {meta.truncated && (
            <p className="text-[11px] text-yellow-300 mt-3">仅展示前 12000 字符，完整内容留到 Sprint3 再接编辑器能力。</p>
          )}
        </div>
      </div>
    </section>
  )
}
