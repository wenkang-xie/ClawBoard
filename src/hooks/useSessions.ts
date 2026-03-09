import { useQuery } from '@tanstack/react-query'
import { useGatewayContext } from './useGateway'

export interface SessionData {
  key: string
  kind?: string
  displayName?: string
  channel?: string
  groupChannel?: string
  space?: string
  updatedAt: number
  sessionId?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  model?: string
  modelProvider?: string
  contextTokens?: number
  lastChannel?: string
  lastTo?: string
  lastAccountId?: string
  agentId?: string  // derived from key parsing
}

export interface SessionMessage {
  role: string
  content: string
  timestamp?: number
  model?: string
}

export interface SessionHistoryData {
  sessionKey: string
  messages: SessionMessage[]
}

export interface SessionsListData {
  ts: number
  count: number
  sessions: SessionData[]
}

function parseAgentIdFromKey(key: string): string {
  // key format: agent:<agentId>:<channel>:<type>:<id>
  // or: agent:<agentId>:subagent:<uuid>
  const parts = key.split(':')
  if (parts[0] === 'agent' && parts[1]) {
    return parts[1]
  }
  return 'unknown'
}

export function useSessions(agentIdFilter?: string) {
  const { connection, connectionState, store } = useGatewayContext()
  
  return useQuery<SessionsListData>({
    queryKey: ['sessions', store.activeGatewayId, agentIdFilter],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      const data = await connection.call<SessionsListData>('sessions.list')
      // Enrich sessions with agentId derived from key
      data.sessions = data.sessions.map(s => ({
        ...s,
        agentId: parseAgentIdFromKey(s.key),
      }))
      // Apply filter if provided
      if (agentIdFilter) {
        data.sessions = data.sessions.filter(s => s.agentId === agentIdFilter)
      }
      return data
    },
    enabled: connectionState === 'ready',
    refetchInterval: store.refreshInterval,
    refetchIntervalInBackground: false,
    staleTime: store.refreshInterval - 1000,
  })
}

// ── useSessionHistory (Gateway sessions.preview fallback) ────────────────────

interface PreviewItem {
  role: string
  text: string
}

interface PreviewResponse {
  ts: number
  previews: Array<{
    key: string
    status: 'ok' | 'empty' | 'missing' | 'error'
    items: PreviewItem[]
  }>
}

export function useSessionHistory(sessionKey: string | null) {
  const { connection, connectionState } = useGatewayContext()

  return useQuery<SessionHistoryData>({
    queryKey: ['session-history', sessionKey],
    queryFn: async () => {
      if (!connection || !sessionKey) throw new Error('No connection or sessionKey')

      const data = await connection.call<PreviewResponse>('sessions.preview', {
        keys: [sessionKey],
        limit: 40,
        maxChars: 1200,
      })

      const preview = data.previews?.find(p => p.key === sessionKey)
      const messages: SessionMessage[] = (preview?.items || []).map(item => ({
        role: item.role || 'unknown',
        content: item.text || '',
      }))

      return {
        sessionKey,
        messages,
      }
    },
    enabled: !!sessionKey && connectionState === 'ready',
    refetchInterval: false,
    retry: 1,
  })
}
