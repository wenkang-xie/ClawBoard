// 多 Gateway 状态管理（localStorage 持久化）

import { GatewayConfig } from './gateway'

const STORAGE_KEY = 'agent-dashboard-gateways'

export interface GatewayStore {
  gateways: GatewayConfig[]
  activeGatewayId: string
  refreshInterval: number
}

const DEFAULT_STORE: GatewayStore = {
  gateways: [
    {
      id: 'local',
      url: 'ws://localhost:18789',
      token: '7bb596c787ae6113d889f5a3cc5809022df281e3b95539ac',
      label: '本机',
    },
  ],
  activeGatewayId: 'local',
  refreshInterval: 10_000,
}

export function loadGatewayStore(): GatewayStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GatewayStore>
      return {
        ...DEFAULT_STORE,
        ...parsed,
        gateways: parsed.gateways?.length ? parsed.gateways : DEFAULT_STORE.gateways,
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_STORE }
}

export function saveGatewayStore(store: GatewayStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore
  }
}
