import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useSessionDetail } from '../hooks/useSessionDetail'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { SessionDetailHeader } from '../components/sessions/detail/SessionDetailHeader'
import { SessionOverviewCards } from '../components/sessions/detail/SessionOverviewCards'
import { SessionRuntimeSection } from '../components/sessions/detail/SessionRuntimeSection'
import { SessionEventsSection } from '../components/sessions/detail/SessionEventsSection'
import { SessionRelationsSection } from '../components/sessions/detail/SessionRelationsSection'
import { SessionMetaSection } from '../components/sessions/detail/SessionMetaSection'
import { SessionDetailStateBanner } from '../components/sessions/detail/SessionDetailStateBanner'
import { parseSessionKey } from '../lib/sessionDetail'

export function SessionDetailPage() {
  const { sessionKey: sessionKeyParam } = useParams()

  const sessionKey = useMemo(() => {
    if (!sessionKeyParam) return ''
    try {
      return decodeURIComponent(sessionKeyParam)
    } catch {
      return sessionKeyParam
    }
  }, [sessionKeyParam])

  const detailQuery = useSessionDetail(sessionKey || null)

  const detail = detailQuery.data?.data
  const session = detail?.session
  const messages = detail?.messages || []
  const relations = detail?.relations

  const parsedKey = parseSessionKey(sessionKey)

  const loadingCore = detailQuery.isLoading
  const hasNoData = !session && messages.length === 0
  const hasError = Boolean(detailQuery.error)

  const isPartial = Boolean(detail?.partial)
  const isStale = detailQuery.isStale

  const refreshedAt = (detailQuery.dataUpdatedAt || 0) || undefined

  const refreshAll = () => {
    void detailQuery.refetch()
  }

  if (!sessionKeyParam) {
    return (
      <div className="space-y-4">
        <SessionDetailStateBanner
          type="error"
          title="无效的 Session 地址"
          description="缺少 sessionKey 参数，无法加载详情。"
        />
      </div>
    )
  }

  if (loadingCore && hasNoData) {
    return <LoadingSpinner size="lg" message="加载 Session 详情..." />
  }

  return (
    <div className="space-y-4">
      <SessionDetailHeader
        sessionKey={sessionKey}
        session={session}
        isStale={isStale}
        isPartial={isPartial}
      />

      {hasError && hasNoData && (
        <SessionDetailStateBanner
          type="error"
          title="Session 详情加载失败"
          description={String(detailQuery.error)}
          action={(
            <button
              type="button"
              className="rounded border border-red-800 px-2 py-1 text-xs text-red-200 hover:bg-red-900/30"
              onClick={refreshAll}
            >
              重试
            </button>
          )}
        />
      )}

      {!loadingCore && hasNoData && !hasError && (
        <SessionDetailStateBanner
          type="empty"
          title="找不到该 Session"
          description="该会话可能已经结束并被清理，或 gateway 已切换。"
        />
      )}

      {isStale && (
        <SessionDetailStateBanner
          type="stale"
          title="当前展示的是缓存数据"
          description="数据可能不是最新状态，建议手动刷新。"
          action={(
            <button
              type="button"
              className="rounded border border-yellow-700 px-2 py-1 text-xs text-yellow-100 hover:bg-yellow-900/30"
              onClick={refreshAll}
            >
              立即刷新
            </button>
          )}
        />
      )}

      {isPartial && (
        <SessionDetailStateBanner
          type="partial"
          title="部分数据可用"
          description="当前只拿到了部分 session 信息。Sprint1 可以先保证可读，后续再补全 BFF 数据面。"
        />
      )}

      <SessionOverviewCards session={session} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SessionRuntimeSection
          loading={loadingCore}
          hasError={hasError}
          errorText={hasError ? String(detailQuery.error) : undefined}
          isStale={isStale}
          isPartial={isPartial}
          refreshedAt={refreshedAt}
        />
        <SessionMetaSection session={session} parsedKey={parsedKey} />
      </div>

      <SessionEventsSection
        messages={messages}
        loading={detailQuery.isLoading}
        error={detailQuery.error ? String(detailQuery.error) : undefined}
      />

      <SessionRelationsSection
        incoming={relations?.incoming || []}
        outgoing={relations?.outgoing || []}
        related={relations?.related || []}
        weakInferenceUsed={relations?.weakInferenceUsed}
        warnings={relations?.warnings || []}
      />
    </div>
  )
}
