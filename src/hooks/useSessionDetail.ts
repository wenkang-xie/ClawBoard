import { useQuery } from '@tanstack/react-query'
import { SessionData, SessionMessage } from './useSessions'
import { BFF_BASE } from '../lib/config'

export interface SessionRelationSessionSummary {
  key: string
  displayName?: string
  agentId?: string
  channel?: string
  groupChannel?: string
  space?: string
  updatedAt?: number
  sessionId?: string
  model?: string
  modelProvider?: string
}

export interface SessionRelationItem {
  id: string
  kind: 'run' | 'session'
  direction: 'incoming' | 'outgoing' | 'related'
  sessionKey: string
  session?: SessionRelationSessionSummary
  runId?: string
  source: string
  derived?: boolean
  confidence?: 'high' | 'medium' | 'low'
  reason?: string
  task?: string
  status?: 'ok' | 'error' | 'running' | 'unknown' | null
  createdAt?: number
  updatedAt?: number
  startedAt?: number
  endedAt?: number
  durationMs?: number
  outcome?: {
    status?: 'ok' | 'error' | null
    error?: string
  }
}

export interface SessionRelationsData {
  sessionKey: string
  incoming: SessionRelationItem[]
  outgoing: SessionRelationItem[]
  related: SessionRelationItem[]
  weakInferenceUsed?: boolean
  partial?: boolean
  warnings?: string[]
}

export interface SessionDetailData {
  sessionKey: string
  session?: SessionData
  messages: SessionMessage[]
  usage?: {
    totalTokens?: number
    totalCost?: number
    messageCounts?: {
      total?: number
      user?: number
      assistant?: number
      toolCalls?: number
    }
    toolUsage?: {
      totalCalls?: number
      uniqueTools?: number
      tools?: Array<{ name: string; count: number }>
    }
  }
  timeseries?: {
    sessionId?: string
    points?: Array<{
      timestamp: number
      totalTokens?: number
      cumulativeTokens?: number
      cumulativeCost?: number
    }>
  }
  relations?: SessionRelationsData
  partial?: boolean
  warnings?: string[]
}

export interface SessionDetailResponse {
  ok: boolean
  ts: number
  cache?: { hit: boolean; ttlMs: number }
  data?: SessionDetailData
  error?: { code?: string; message?: string }
}

export function useSessionDetail(sessionKey: string | null) {
  return useQuery<SessionDetailResponse>({
    queryKey: ['session-detail-bff', sessionKey],
    queryFn: async () => {
      if (!sessionKey) throw new Error('Missing sessionKey')
      const url = `${BFF_BASE}/api/sessions/${encodeURIComponent(sessionKey)}/detail?eventsLimit=120&previewLimit=24&relationLimit=10&relatedLimit=6`
      const resp = await fetch(url)
      const data = (await resp.json()) as SessionDetailResponse

      if (!resp.ok || !data.ok) {
        const message = data?.error?.message || `BFF session detail HTTP ${resp.status}`
        throw new Error(message)
      }

      return data
    },
    enabled: Boolean(sessionKey),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    retry: 1,
  })
}
