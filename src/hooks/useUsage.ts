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
  
  // Computed aggregations
  totalTokens?: number
  totalCost?: number
  dailyAggregated?: { date: string; tokens: number; cost: number }[]
  modelBreakdown?: { model: string; provider: string; tokens: number; cost: number }[]
  previousPeriodTokens?: number
  previousPeriodCost?: number
}

function aggregateUsage(sessions: SessionUsage[], days: number = 30): Omit<UsageData, 'updatedAt' | 'startDate' | 'endDate' | 'sessions'> {
  const dailyMap = new Map<string, { tokens: number; cost: number }>()
  const modelMap = new Map<string, { provider: string; tokens: number; cost: number }>()
  let totalTokens = 0
  let totalCost = 0

  for (const session of sessions) {
    // Aggregate daily breakdown
    for (const day of session.usage.dailyBreakdown || []) {
      const existing = dailyMap.get(day.date) || { tokens: 0, cost: 0 }
      dailyMap.set(day.date, {
        tokens: existing.tokens + day.tokens,
        cost: existing.cost + day.cost,
      })
      totalTokens += day.tokens
      totalCost += day.cost
    }

    // Aggregate model breakdown
    for (const modelUsage of session.usage.dailyModelUsage || []) {
      const key = `${modelUsage.provider}:${modelUsage.model}`
      const existing = modelMap.get(key) || { provider: modelUsage.provider, tokens: 0, cost: 0 }
      modelMap.set(key, {
        provider: modelUsage.provider,
        tokens: existing.tokens + modelUsage.tokens,
        cost: existing.cost + modelUsage.cost,
      })
    }
  }

  const dailyAggregated = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)

  // Sort model breakdown by tokens descending, take top 5
  const modelBreakdown = Array.from(modelMap.entries())
    .map(([key, data]) => {
      const [provider, model] = key.split(':')
      return { model, provider, tokens: data.tokens, cost: data.cost }
    })
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5)

  // Calculate previous period for trend
  const sortedDaily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  const midPoint = Math.floor(sortedDaily.length / 2)
  const currentPeriod = sortedDaily.slice(midPoint)
  const previousPeriod = sortedDaily.slice(0, midPoint)
  
  const previousPeriodTokens = previousPeriod.reduce((sum, d) => sum + d.tokens, 0)
  const previousPeriodCost = previousPeriod.reduce((sum, d) => sum + d.cost, 0)

  return { totalTokens, totalCost, dailyAggregated, modelBreakdown, previousPeriodTokens, previousPeriodCost }
}

export function useUsage() {
  const { connection, connectionState, store } = useGatewayContext()

  return useQuery<UsageData>({
    queryKey: ['usage', store.activeGatewayId],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      const data = await connection.call<UsageData>('sessions.usage')
      const aggregated = aggregateUsage(data.sessions || [])
      return { ...data, ...aggregated }
    },
    enabled: connectionState === 'ready',
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 29_000,
  })
}

// Hook for filtered usage (by date range)
export function useUsageFiltered(days: number = 14) {
  const { connection, connectionState, store } = useGatewayContext()

  return useQuery<UsageData>({
    queryKey: ['usage', store.activeGatewayId, days],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      const data = await connection.call<UsageData>('sessions.usage')
      const aggregated = aggregateUsage(data.sessions || [], days)
      return { ...data, ...aggregated }
    },
    enabled: connectionState === 'ready',
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 29_000,
  })
}
