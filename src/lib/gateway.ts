// Gateway WebSocket RPC 连接管理器

export type GatewayState = 'disconnected' | 'connecting' | 'authenticating' | 'ready' | 'error'

export interface GatewayConfig {
  id: string
  url: string
  token: string
  label?: string
}

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  timeoutId: ReturnType<typeof setTimeout>
}

type StateChangeHandler = (state: GatewayState, error?: string) => void

const CALL_TIMEOUT_MS = 15_000
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

export class GatewayConnection {
  readonly config: GatewayConfig
  private ws: WebSocket | null = null
  private _state: GatewayState = 'disconnected'
  private pendingCalls = new Map<string, PendingCall>()
  private reconnectDelay = RECONNECT_BASE_MS
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = false
  private stateHandlers: Set<StateChangeHandler> = new Set()
  private lastError: string | undefined

  constructor(config: GatewayConfig) {
    this.config = config
  }

  get state(): GatewayState {
    return this._state
  }

  get error(): string | undefined {
    return this.lastError
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler)
    return () => this.stateHandlers.delete(handler)
  }

  private setState(state: GatewayState, error?: string) {
    this._state = state
    this.lastError = error
    this.stateHandlers.forEach(h => h(state, error))
  }

  connect() {
    if (this._state === 'connecting' || this._state === 'authenticating' || this._state === 'ready') {
      return
    }
    this.shouldReconnect = true
    this._doConnect()
  }

  private _doConnect() {
    this.setState('connecting')
    try {
      const ws = new WebSocket(this.config.url)
      this.ws = ws

      ws.onopen = () => {
        // Wait for connect.challenge event before sending connect request.
      }

      ws.onmessage = (event) => {
        this._handleMessage(event.data as string)
      }

      ws.onerror = () => {
        this.setState('error', 'WebSocket connection error')
        this._rejectAllPending('Connection error')
      }

      ws.onclose = () => {
        if (this._state !== 'error') {
          this.setState('disconnected')
        }
        this._rejectAllPending('Connection closed')
        this._scheduleReconnect()
      }
    } catch (e) {
      this.setState('error', String(e))
      this._scheduleReconnect()
    }
  }

  private _handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw) as Record<string, unknown>

      // Challenge-response: Server sends connect.challenge event
      if (msg.type === 'event' && msg.event === 'connect.challenge') {
        const payload = msg.payload as Record<string, unknown> | undefined
        const nonce = typeof payload?.nonce === 'string' ? payload.nonce : undefined
        if (nonce) {
          this._sendConnect(nonce)
        }
        return
      }

      // RPC response (custom frame format, NOT JSON-RPC 2.0)
      if (msg.type === 'res' && typeof msg.id === 'string') {
        const pending = this.pendingCalls.get(msg.id)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingCalls.delete(msg.id)
          if (msg.ok === false) {
            pending.reject(msg.payload)
          } else {
            pending.resolve(msg.payload)
          }
        }
        return
      }

      // Server events (push notifications) - ignore for now
    } catch {
      // Ignore parse errors
    }
  }

  private _rejectAllPending(reason: string) {
    this.pendingCalls.forEach(pending => {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error(reason))
    })
    this.pendingCalls.clear()
  }

  private _scheduleReconnect() {
    if (!this.shouldReconnect) return
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.shouldReconnect) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS)
        this._doConnect()
      }
    }, this.reconnectDelay)
  }

  private _sendConnect(nonce: string) {
    if (!this.ws) {
      return
    }
    this.setState('authenticating')
    const id = this._generateId()
    const connectMsg = {
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'webchat-ui',
          displayName: 'Agent Dashboard',
          version: '0.1.0',
          platform: 'browser',
          mode: 'ui',
        },
        caps: [],
        auth: { token: this.config.token },
        role: 'operator',
        scopes: ['operator.admin'],
      },
    }
    void nonce

    const timeoutId = setTimeout(() => {
      this.pendingCalls.delete(id)
      this.setState('error', 'Connect handshake timed out')
      this._scheduleReconnect()
    }, CALL_TIMEOUT_MS)

    this.pendingCalls.set(id, {
      resolve: () => {
        this.setState('ready')
        this.reconnectDelay = RECONNECT_BASE_MS
      },
      reject: (err: unknown) => {
        const msg = err && typeof err === 'object'
          ? (err as Record<string, unknown>).message as string
          : String(err)
        this.setState('error', `Auth failed: ${msg}`)
        this._scheduleReconnect()
      },
      timeoutId,
    })

    try {
      this.ws.send(JSON.stringify(connectMsg))
    } catch (e) {
      clearTimeout(timeoutId)
      this.pendingCalls.delete(id)
      this.setState('error', String(e))
      this._scheduleReconnect()
    }
  }

  private _generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (this._state !== 'ready' && this._state !== 'authenticating') {
      throw new Error(`Gateway not ready (state: ${this._state})`)
    }

    const id = this._generateId()
    const request = {
      type: 'req',
      id,
      method,
      params,
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCalls.delete(id)
        reject(new Error(`RPC call ${method} timed out`))
      }, CALL_TIMEOUT_MS)

      this.pendingCalls.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      })

      try {
        this.ws!.send(JSON.stringify(request))
      } catch (e) {
        clearTimeout(timeoutId)
        this.pendingCalls.delete(id)
        reject(e)
      }
    })
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this._rejectAllPending('Manually disconnected')
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.setState('disconnected')
  }
}
