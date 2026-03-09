import { SessionData } from '../../../hooks/useSessions'
import { formatDate, formatTokens, formatRelativeTime } from '../../../lib/utils'
import { normalizeTimestamp } from '../../../lib/sessionDetail'

interface SessionOverviewCardsProps {
  session?: SessionData
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-200 break-all">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  )
}

export function SessionOverviewCards({ session }: SessionOverviewCardsProps) {
  const updatedAt = normalizeTimestamp(session?.updatedAt)

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Agent / Channel"
        value={`${session?.agentId || '-'} · ${session?.channel || '-'}`}
        sub={session?.lastTo ? `to: ${session.lastTo}` : undefined}
      />
      <Card
        label="Tokens"
        value={formatTokens(session?.totalTokens || 0)}
        sub={`in: ${formatTokens(session?.inputTokens || 0)} / out: ${formatTokens(session?.outputTokens || 0)}`}
      />
      <Card
        label="Model"
        value={session?.model || '-'}
        sub={session?.modelProvider || undefined}
      />
      <Card
        label="更新时间"
        value={updatedAt ? formatDate(updatedAt) : '-'}
        sub={updatedAt ? formatRelativeTime(updatedAt) : '暂无更新时间'}
      />
    </div>
  )
}
