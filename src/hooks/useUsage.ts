import { useQuery } from '@tanstack/react-query'
import { useGatewayContext } from './useGateway'

export interface DailyBreakdown {
  date: string
  tokens: number
  cost: number
}

export interface DailyModelUsage {
  date: string
  provider: string
  model: string
  tokens: number
  cost: number
  count: number
}

export interface AggregatedDailyUsage {
  date: string
  tokens: number
  cost: number
}

export interface ModelUsageAggregate {
  model: string
  provider: string
  tokens: number
  cost: number
  count?: number
}

export interface AgentUsageAggregate {
  agentId: string
  tokens: number
  cost: number
  sessions: number
  lastActivity?: number
}

export interface SessionUsage {
  key?: string
  sessionId: string
  agentId?: string
  updatedAt?: number
  usage: {
    firstActivity: number
    lastActivity: number
    durationMs: number
    activityDates: string[]
    dailyBreakdown: DailyBreakdown[]
    dailyModelUsage?: DailyModelUsage[]
    messageCounts?: {
      total: number
      user: number
      assistant: number
    }
    totalTokens?: number
    totalCost?: number
  }
}

export interface UsageData {
  updatedAt: number
  startDate: string
  endDate: string
  sessions: SessionUsage[]
  totalTokens?: number
  totalCost?: number
  dailyAggregated?: AggregatedDailyUsage[]
  modelBreakdown?: ModelUsageAggregate[]
  agentBreakdown?: AgentUsageAggregate[]
  previousPeriodTokens?: number
  previousPeriodCost?: number
}

export const USAGE_POLL_INTERVAL_MS = 30_000
export const USAGE_STALE_TIME_MS = 25_000

function parseAgentIdFromSessionKey(sessionKey?: string): string {
  if (!sessionKey) return 'unknown'
  const parts = sessionKey.split(':')
  if (parts[0] === 'agent' && parts[1]) return parts[1]
  return 'unknown'
}

function toDateKey(timestamp?: number): string | null {
  if (!timestamp || Number.isNaN(timestamp)) return null
  return new Date(timestamp).toISOString().slice(0, 10)
}

function sortDaily(points: AggregatedDailyUsage[] = []): AggregatedDailyUsage[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date))
}

function sortModels(models: ModelUsageAggregate[] = []): ModelUsageAggregate[] {
  return [...models].sort((a, b) => b.tokens - a.tokens)
}

function sortAgents(agents: AgentUsageAggregate[] = []): AgentUsageAggregate[] {
  return [...agents].sort((a, b) => {
    if (b.tokens !== a.tokens) return b.tokens - a.tokens
    return (b.lastActivity || 0) - (a.lastActivity || 0)
  })
}

function aggregateUsage(sessions: SessionUsage[]): Omit<UsageData, 'updatedAt' | 'sessions'> {
  const dailyMap = new Map<string, { tokens: number; cost: number }>()
  const modelMap = new Map<string, { provider: string; tokens: number; cost: number; count: number }>()
  const agentMap = new Map<string, { tokens: number; cost: number; sessions: number; lastActivity?: number }>()
  let totalTokens = 0
  let totalCost = 0

  for (const session of sessions) {
    const agentId = session.agentId || parseAgentIdFromSessionKey(session.key)
    const dailyBreakdown = session.usage.dailyBreakdown || []
    const dailyModelUsage = session.usage.dailyModelUsage || []

    let sessionTokens = 0
    let sessionCost = 0

    if (dailyBreakdown.length > 0) {
      for (const day of dailyBreakdown) {
        const existing = dailyMap.get(day.date) || { tokens: 0, cost: 0 }
        dailyMap.set(day.date, {
          tokens: existing.tokens + day.tokens,
          cost: existing.cost + day.cost,
        })
        sessionTokens += day.tokens
        sessionCost += day.cost
      }
    } else {
      sessionTokens = session.usage.totalTokens || 0
      sessionCost = session.usage.totalCost || 0

      const fallbackDate = toDateKey(session.usage.lastActivity || session.updatedAt)
      if (fallbackDate && (sessionTokens > 0 || sessionCost > 0)) {
        const existing = dailyMap.get(fallbackDate) || { tokens: 0, cost: 0 }
        dailyMap.set(fallbackDate, {
          tokens: existing.tokens + sessionTokens,
          cost: existing.cost + sessionCost,
        })
      }
    }

    totalTokens += session.usage.totalTokens ?? sessionTokens
    totalCost += session.usage.totalCost ?? sessionCost

    const existingAgent = agentMap.get(agentId) || { tokens: 0, cost: 0, sessions: 0, lastActivity: 0 }
    agentMap.set(agentId, {
      tokens: existingAgent.tokens + (session.usage.totalTokens ?? sessionTokens),
      cost: existingAgent.cost + (session.usage.totalCost ?? sessionCost),
      sessions: existingAgent.sessions + 1,
      lastActivity: Math.max(existingAgent.lastActivity || 0, session.usage.lastActivity || session.updatedAt || 0),
    })

    for (const modelUsage of dailyModelUsage) {
      const key = `${modelUsage.provider}:${modelUsage.model}`
      const existing = modelMap.get(key) || { provider: modelUsage.provider, tokens: 0, cost: 0, count: 0 }
      modelMap.set(key, {
        provider: modelUsage.provider,
        tokens: existing.tokens + modelUsage.tokens,
        cost: existing.cost + modelUsage.cost,
        count: existing.count + (modelUsage.count || 0),
      })
    }
  }

  const dailyAggregated = sortDaily(Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })))

  const modelBreakdown = sortModels(
    Array.from(modelMap.entries()).map(([key, data]) => {
      const separatorIndex = key.indexOf(':')
      const provider = separatorIndex >= 0 ? key.slice(0, separatorIndex) : data.provider
      const model = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key
      return {
        model,
        provider,
        tokens: data.tokens,
        cost: data.cost,
        count: data.count,
      }
    })
  )

  const agentBreakdown = sortAgents(
    Array.from(agentMap.entries()).map(([agentId, data]) => ({ agentId, ...data }))
  )

  const midPoint = Math.floor(dailyAggregated.length / 2)
  const previousPeriod = dailyAggregated.slice(0, midPoint)
  const previousPeriodTokens = previousPeriod.reduce((sum, item) => sum + item.tokens, 0)
  const previousPeriodCost = previousPeriod.reduce((sum, item) => sum + item.cost, 0)

  return {
    startDate: dailyAggregated[0]?.date || '',
    endDate: dailyAggregated[dailyAggregated.length - 1]?.date || '',
    totalTokens,
    totalCost,
    dailyAggregated,
    modelBreakdown,
    agentBreakdown,
    previousPeriodTokens,
    previousPeriodCost,
  }
}

function normalizeUsage(data: UsageData): UsageData {
  const aggregated = aggregateUsage(data.sessions || [])

  return {
    ...data,
    startDate: data.startDate || aggregated.startDate,
    endDate: data.endDate || aggregated.endDate,
    totalTokens: data.totalTokens ?? aggregated.totalTokens,
    totalCost: data.totalCost ?? aggregated.totalCost,
    dailyAggregated: data.dailyAggregated?.length ? sortDaily(data.dailyAggregated) : aggregated.dailyAggregated,
    modelBreakdown: data.modelBreakdown?.length ? sortModels(data.modelBreakdown) : aggregated.modelBreakdown,
    agentBreakdown: data.agentBreakdown?.length ? sortAgents(data.agentBreakdown) : aggregated.agentBreakdown,
    previousPeriodTokens: data.previousPeriodTokens ?? aggregated.previousPeriodTokens,
    previousPeriodCost: data.previousPeriodCost ?? aggregated.previousPeriodCost,
  }
}

export function useUsage() {
  const { connection, connectionState, store } = useGatewayContext()

  return useQuery<UsageData>({
    queryKey: ['usage', store.activeGatewayId],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      const data = await connection.call<UsageData>('sessions.usage')
      return normalizeUsage(data)
    },
    enabled: connectionState === 'ready',
    refetchInterval: USAGE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: USAGE_STALE_TIME_MS,
  })
}

export function useUsageFiltered(days: number = 14) {
  const { connection, connectionState, store } = useGatewayContext()

  return useQuery<UsageData>({
    queryKey: ['usage', store.activeGatewayId, days],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      const data = await connection.call<UsageData>('sessions.usage')
      const normalized = normalizeUsage(data)

      if (days <= 0) return normalized

      return {
        ...normalized,
        dailyAggregated: normalized.dailyAggregated?.slice(-days),
      }
    },
    enabled: connectionState === 'ready',
    refetchInterval: USAGE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: USAGE_STALE_TIME_MS,
  })
}
