import { useQuery } from '@tanstack/react-query'
import { useGatewayContext } from './useGateway'

export interface ChannelAccount {
  configured: boolean
  running: boolean
  lastStartAt: string | null
  lastStopAt: string | null
  lastError: string | null
  accountId: string
}

export interface ChannelStatus {
  configured: boolean
  running: boolean
  lastStartAt: string | null
  lastStopAt: string | null
  lastError: string | null
  accountId: string
  accounts?: Record<string, ChannelAccount>
}

export interface AgentHealth {
  agentId: string
  sessions?: {
    count: number
    recent?: unknown[]
  }
}

export interface HealthData {
  ok: boolean
  ts: number
  durationMs: number
  channels: {
    discord?: ChannelStatus
    telegram?: ChannelStatus
    [key: string]: ChannelStatus | undefined
  }
  agents?: AgentHealth[]
}

export function useHealth() {
  const { connection, connectionState, store } = useGatewayContext()
  
  return useQuery<HealthData>({
    queryKey: ['health', store.activeGatewayId],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      return connection.call<HealthData>('health')
    },
    enabled: connectionState === 'ready',
    refetchInterval: store.refreshInterval,
    refetchIntervalInBackground: false,
    staleTime: store.refreshInterval - 1000,
  })
}
