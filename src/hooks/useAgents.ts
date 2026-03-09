import { useQuery } from '@tanstack/react-query'
import { useGatewayContext } from './useGateway'

export interface AgentIdentity {
  name?: string
  theme?: string
  emoji?: string
  avatar?: string
}

export interface AgentData {
  id: string
  name?: string
  identity?: AgentIdentity
  model?: string
  workspace?: string
}

export interface AgentsListData {
  defaultId: string
  mainKey: string
  scope: string
  agents: AgentData[]
}

export function useAgents() {
  const { connection, connectionState, store } = useGatewayContext()

  return useQuery<AgentsListData>({
    queryKey: ['agents', store.activeGatewayId],
    queryFn: async () => {
      if (!connection) throw new Error('No connection')
      return connection.call<AgentsListData>('agents.list')
    },
    enabled: connectionState === 'ready',
    refetchInterval: store.refreshInterval * 3, // agents don't change often
    refetchIntervalInBackground: false,
    staleTime: store.refreshInterval * 3 - 1000,
  })
}
