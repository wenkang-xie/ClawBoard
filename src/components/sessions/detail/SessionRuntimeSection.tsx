interface SessionRuntimeSectionProps {
  loading: boolean
  hasError: boolean
  errorText?: string
  isStale: boolean
  isPartial: boolean
  refreshedAt?: number
}

function RuntimeRow({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'warn' | 'error' | 'ok' }) {
  const toneClass = tone === 'ok'
    ? 'text-green-400'
    : tone === 'warn'
      ? 'text-yellow-400'
      : tone === 'error'
        ? 'text-red-400'
        : 'text-gray-300'

  return (
    <div className="flex items-center justify-between border-b border-gray-800/60 py-2 text-sm last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className={toneClass}>{value}</span>
    </div>
  )
}

export function SessionRuntimeSection({
  loading,
  hasError,
  errorText,
  isStale,
  isPartial,
  refreshedAt,
}: SessionRuntimeSectionProps) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-sm font-semibold text-gray-200">运行状态</h2>
      <div className="mt-3 space-y-1">
        <RuntimeRow label="数据获取" value={loading ? '加载中' : '完成'} tone={loading ? 'warn' : 'ok'} />
        <RuntimeRow
          label="错误情况"
          value={hasError ? (errorText || '加载失败') : '正常'}
          tone={hasError ? 'error' : 'ok'}
        />
        <RuntimeRow label="新鲜度" value={isStale ? 'stale（建议刷新）' : 'fresh'} tone={isStale ? 'warn' : 'ok'} />
        <RuntimeRow label="完整度" value={isPartial ? 'partial-data' : 'complete'} tone={isPartial ? 'warn' : 'ok'} />
        <RuntimeRow
          label="最近成功刷新"
          value={refreshedAt ? new Date(refreshedAt).toLocaleString('zh-CN') : '-'}
        />
      </div>
    </section>
  )
}
