import { SessionMessage } from '../../../hooks/useSessions'
import { normalizeTimestamp } from '../../../lib/sessionDetail'

interface SessionEventsSectionProps {
  messages: SessionMessage[]
  loading: boolean
  error?: string
}

export function SessionEventsSection({ messages, loading, error }: SessionEventsSectionProps) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-200">日志 / 事件</h2>
        <span className="text-xs text-gray-500">{messages.length} 条</span>
      </div>

      {loading && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-500">
          加载会话历史中...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-300">
          加载历史失败：{error}
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-500">
          暂无会话消息。
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {messages.map((msg, idx) => {
            const ts = normalizeTimestamp(msg.timestamp)
            const roleClass = msg.role === 'user' || msg.role === 'human'
              ? 'text-blue-300'
              : msg.role === 'assistant' || msg.role === 'agent'
                ? 'text-green-300'
                : 'text-gray-300'

            return (
              <div key={`${msg.timestamp || idx}-${idx}`} className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className={roleClass}>{msg.role}</span>
                  {msg.model && <span className="text-gray-600">{msg.model}</span>}
                  <span className="ml-auto text-gray-600">
                    {ts ? new Date(ts).toLocaleString('zh-CN') : `#${idx + 1}`}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-gray-300">
                  {msg.content}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
