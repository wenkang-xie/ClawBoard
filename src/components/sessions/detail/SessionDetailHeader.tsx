import { useNavigate } from 'react-router-dom'
import { MdArrowBack } from 'react-icons/md'
import { SessionData } from '../../../hooks/useSessions'
import { StatusBadge } from '../../shared/StatusBadge'
import { truncateKey } from '../../../lib/utils'
import { getSessionStatus } from '../../../lib/sessionDetail'

interface SessionDetailHeaderProps {
  sessionKey: string
  session?: SessionData
  isStale: boolean
  isPartial: boolean
}

export function SessionDetailHeader({
  sessionKey,
  session,
  isStale,
  isPartial,
}: SessionDetailHeaderProps) {
  const navigate = useNavigate()
  const status = getSessionStatus(session)

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
      >
        <MdArrowBack /> 返回 Sessions
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">Session 详情</h1>
          <p className="mt-1 font-mono text-xs text-gray-400">{truncateKey(sessionKey, 120)}</p>
          {session?.displayName && (
            <p className="mt-1 text-sm text-gray-500">{session.displayName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={status.status} label={status.label} size="sm" />
          {isStale && <StatusBadge status="warning" label="数据非最新" size="sm" />}
          {isPartial && <StatusBadge status="warning" label="部分数据" size="sm" />}
        </div>
      </div>

      {status.hint && <p className="text-xs text-gray-500">{status.hint}</p>}
    </div>
  )
}
