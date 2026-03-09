import { Link } from 'react-router-dom'
import { SessionRelationItem } from '../../../hooks/useSessionDetail'
import { formatDuration, formatRelativeTime, truncateKey } from '../../../lib/utils'

interface SessionRelationsSectionProps {
  incoming: SessionRelationItem[]
  outgoing: SessionRelationItem[]
  related?: SessionRelationItem[]
  weakInferenceUsed?: boolean
  warnings?: string[]
}

function RelationBadge({ item }: { item: SessionRelationItem }) {
  const tone = item.derived
    ? 'border-amber-700/60 bg-amber-950/40 text-amber-300'
    : 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300'

  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>
      {item.derived ? '推导' : '真实'}
    </span>
  )
}

function StatusText({ item }: { item: SessionRelationItem }) {
  const status = item.status || 'unknown'
  const tone =
    status === 'ok'
      ? 'text-emerald-400'
      : status === 'error'
        ? 'text-red-400'
        : status === 'running'
          ? 'text-amber-400'
          : 'text-gray-500'

  return <span className={tone}>{status}</span>
}

function RelationTime({ item }: { item: SessionRelationItem }) {
  if (typeof item.durationMs === 'number' && item.durationMs > 0) {
    return <span className="text-gray-500">{formatDuration(item.durationMs)}</span>
  }

  const ts = item.updatedAt || item.createdAt || item.startedAt || item.session?.updatedAt
  if (!ts) return <span className="text-gray-600">-</span>
  return <span className="text-gray-500">{formatRelativeTime(ts)}</span>
}

function RelationList({ title, items, emptyText }: { title: string; items: SessionRelationItem[]; emptyText: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm text-gray-200">{title}</h3>
        <span className="text-xs text-gray-500">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map(item => {
            const label = item.session?.displayName || item.task || truncateKey(item.sessionKey, 72)
            const sub = item.session?.displayName ? truncateKey(item.sessionKey, 72) : undefined
            const detailHref = `/sessions/${encodeURIComponent(item.sessionKey)}`

            return (
              <div key={item.id} className="rounded border border-gray-800 bg-gray-900/70 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={detailHref} className="block truncate text-xs text-indigo-300 hover:text-indigo-200">
                      {label}
                    </Link>
                    {sub && <p className="mt-0.5 font-mono text-[11px] text-gray-500">{sub}</p>}
                  </div>
                  <RelationBadge item={item} />
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-gray-500">{item.session?.agentId || 'unknown'}</span>
                  {item.session?.channel && <span className="text-gray-600">· {item.session.channel}</span>}
                  <span className="text-gray-700">·</span>
                  <StatusText item={item} />
                  <span className="text-gray-700">·</span>
                  <RelationTime item={item} />
                </div>

                {item.reason && <p className="mt-1 text-xs text-gray-500">{item.reason}</p>}
                {item.task && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{item.task}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SessionRelationsSection({ incoming, outgoing, related = [], weakInferenceUsed, warnings = [] }: SessionRelationsSectionProps) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-200">上下游关系</h2>
        {weakInferenceUsed && (
          <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-300">
            含弱关系推导
          </span>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
          <p>relations 存在降级：{warnings[0]}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <RelationList title="上游（谁触发了我）" items={incoming} emptyText="暂无可识别上游。" />
        <RelationList title="下游（我触发了谁）" items={outgoing} emptyText="暂无可识别下游。" />
        <RelationList title="关联（同上下文弱关系）" items={related} emptyText="暂无额外关联线索。" />
      </div>
    </section>
  )
}
