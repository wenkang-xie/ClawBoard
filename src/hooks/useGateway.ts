// Gateway Context & Hook

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { GatewayConnection, GatewayConfig, GatewayState } from '../lib/gateway'
import { GatewayStore, loadGatewayStore, saveGatewayStore } from '../lib/gatewayStore'

interface GatewayContextValue {
  store: GatewayStore
  connection: GatewayConnection | null
  connectionState: GatewayState
  connectionError?: string
  setActiveGateway: (id: string) => void
  addGateway: (config: Omit<GatewayConfig, 'id'>) => void
  removeGateway: (id: string) => void
  updateGateway: (config: GatewayConfig) => void
  updateRefreshInterval: (ms: number) => void
  testConnection: (config: GatewayConfig) => Promise<boolean>
}

const GatewayContext = createContext<GatewayContextValue | null>(null)

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<GatewayStore>(loadGatewayStore)
  const [connection, setConnection] = useState<GatewayConnection | null>(null)
  const [connectionState, setConnectionState] = useState<GatewayState>('disconnected')
  const [connectionError, setConnectionError] = useState<string | undefined>()
  const connectionRef = useRef<GatewayConnection | null>(null)

  // 初始化/切换 Gateway 连接
  useEffect(() => {
    const activeConfig = store.gateways.find(g => g.id === store.activeGatewayId)
    if (!activeConfig) return

    // 断开旧连接
    if (connectionRef.current) {
      connectionRef.current.disconnect()
    }

    const conn = new GatewayConnection(activeConfig)
    connectionRef.current = conn
    setConnection(conn)
    setConnectionState('connecting')

    const unsubscribe = conn.onStateChange((state, error) => {
      setConnectionState(state)
      setConnectionError(error)
    })

    conn.connect()

    return () => {
      unsubscribe()
      conn.disconnect()
    }
  }, [store.activeGatewayId, store.gateways])

  const updateStore = useCallback((updater: (prev: GatewayStore) => GatewayStore) => {
    setStore(prev => {
      const next = updater(prev)
      saveGatewayStore(next)
      return next
    })
  }, [])

  const setActiveGateway = useCallback((id: string) => {
    updateStore(prev => ({ ...prev, activeGatewayId: id }))
  }, [updateStore])

  const addGateway = useCallback((config: Omit<GatewayConfig, 'id'>) => {
    const id = `gateway-${Date.now()}`
    updateStore(prev => ({
      ...prev,
      gateways: [...prev.gateways, { ...config, id }],
    }))
  }, [updateStore])

  const removeGateway = useCallback((id: string) => {
    updateStore(prev => ({
      ...prev,
      gateways: prev.gateways.filter(g => g.id !== id),
      activeGatewayId: prev.activeGatewayId === id
        ? (prev.gateways[0]?.id ?? '')
        : prev.activeGatewayId,
    }))
  }, [updateStore])

  const updateGateway = useCallback((config: GatewayConfig) => {
    updateStore(prev => ({
      ...prev,
      gateways: prev.gateways.map(g => g.id === config.id ? config : g),
    }))
  }, [updateStore])

  const updateRefreshInterval = useCallback((ms: number) => {
    updateStore(prev => ({ ...prev, refreshInterval: ms }))
  }, [updateStore])

  const testConnection = useCallback(async (config: GatewayConfig): Promise<boolean> => {
    const testConn = new GatewayConnection(config)
    return new Promise(resolve => {
      const unsubscribe = testConn.onStateChange(async (state) => {
        if (state === 'ready') {
          try {
            await testConn.call('health')
            unsubscribe()
            testConn.disconnect()
            resolve(true)
          } catch {
            unsubscribe()
            testConn.disconnect()
            resolve(false)
          }
        } else if (state === 'error') {
          unsubscribe()
          testConn.disconnect()
          resolve(false)
        }
      })
      testConn.connect()
      setTimeout(() => {
        unsubscribe()
        testConn.disconnect()
        resolve(false)
      }, 10_000)
    })
  }, [])

  return React.createElement(GatewayContext.Provider, {
    value: {
      store,
      connection,
      connectionState,
      connectionError,
      setActiveGateway,
      addGateway,
      removeGateway,
      updateGateway,
      updateRefreshInterval,
      testConnection,
    }
  }, children)
}

export function useGatewayContext(): GatewayContextValue {
  const ctx = useContext(GatewayContext)
  if (!ctx) throw new Error('useGatewayContext must be used inside GatewayProvider')
  return ctx
}
