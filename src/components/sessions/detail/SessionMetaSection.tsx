import { SessionData } from '../../../hooks/useSessions'
import { ParsedSessionKey } from '../../../lib/sessionDetail'

interface SessionMetaSectionProps {
  session?: SessionData
  parsedKey: ParsedSessionKey
}

function MetaItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-gray-800 bg-gray-950/60 p-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-1 break-all text-xs text-gray-300">{value || '-'}</p>
    </div>
  )
}

export function SessionMetaSection({ session, parsedKey }: SessionMetaSectionProps) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-200">元信息</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <MetaItem label="scope" value={parsedKey.scope} />
        <MetaItem label="agentId" value={parsedKey.agentId} />
        <MetaItem label="channel" value={parsedKey.channel} />
        <MetaItem label="chatType" value={parsedKey.chatType} />
        <MetaItem label="target" value={parsedKey.target} />
        <MetaItem label="sessionId" value={session?.sessionId} />
        <MetaItem label="space" value={session?.space} />
        <MetaItem label="groupChannel" value={session?.groupChannel} />
        <MetaItem label="lastAccountId" value={session?.lastAccountId} />
      </div>
    </section>
  )
}
