import { V1MemoryCategory, V1MemoryFileNode } from '../../hooks/useMemory'

interface MemoryIndexPanelProps {
  files: V1MemoryFileNode[]
  selectedPath: string | null
  searchText: string
  onSearchTextChange: (value: string) => void
  category: V1MemoryCategory | 'all'
  onCategoryChange: (value: V1MemoryCategory | 'all') => void
  onSelect: (filePath: string) => void
  totalCount: number
}

const categoryOptions: Array<{ value: V1MemoryCategory | 'all'; label: string }> = [
  { value: 'all', label: '全部分类' },
  { value: 'index', label: 'Index' },
  { value: 'catalog', label: '基础资料' },
  { value: 'daily', label: '日志' },
  { value: 'archive', label: '归档' },
  { value: 'note', label: '其他' },
]

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
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

export function MemoryIndexPanel({
  files,
  selectedPath,
  searchText,
  onSearchTextChange,
  category,
  onCategoryChange,
  onSelect,
  totalCount,
}: MemoryIndexPanelProps) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="border-b border-gray-800 p-3 space-y-2">
        <input
          value={searchText}
          onChange={e => onSearchTextChange(e.target.value)}
          placeholder="搜索文件名 / 路径 / 标签"
          className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
        />
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={e => onCategoryChange(e.target.value as V1MemoryCategory | 'all')}
            className="bg-gray-800 text-gray-200 text-sm rounded-md px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
          >
            {categoryOptions.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-gray-500">
            {files.length} / {totalCount}
          </span>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto divide-y divide-gray-800">
        {files.map(file => {
          const selected = selectedPath === file.path
          return (
            <button
              key={file.path}
              type="button"
              onClick={() => onSelect(file.path)}
              className={`w-full text-left px-3 py-2.5 transition-colors ${
                selected
                  ? 'bg-indigo-600/20 border-l-2 border-indigo-400'
                  : 'hover:bg-gray-800/70 border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-100 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{file.relativePath}</p>
                </div>
                <span className="text-[10px] text-gray-500">{formatDate(file.modifiedAt)}</span>
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                  {file.category}
                </span>
                {file.ext && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-500">
                    {file.ext}
                  </span>
                )}
                {!file.previewable && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-600">
                    no preview
                  </span>
                )}
                {file.tags.slice(0, 2).map(tag => (
                  <span key={`${file.path}-${tag}`} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/70 text-gray-500">
                    #{tag}
                  </span>
                ))}
                <span className="ml-auto text-[10px] text-gray-600">{formatBytes(file.sizeBytes)}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
