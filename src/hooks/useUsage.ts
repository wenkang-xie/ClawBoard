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
}

function aggregateUsage(sessions: SessionUsage[]): Omit<UsageData, 'updatedAt' | 'startDate' | 'endDate' | 'sessions'> {
  const dailyMap = new Map<string, { tokens: number; cost: number }>()
  let totalTokens = 0
  let totalCost = 0

  for (const session of sessions) {
    for (const day of session.usage.dailyBreakdown || []) {
      const existing = dailyMap.get(day.date) || { tokens: 0, cost: 0 }
      dailyMap.set(day.date, {
        tokens: existing.tokens + day.tokens,
        cost: existing.cost + day.cost,
      })
      totalTokens += day.tokens
      totalCost += day.cost
    }
  }

  const dailyAggregated = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // last 30 days

  return { totalTokens, totalCost, dailyAggregated }
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
