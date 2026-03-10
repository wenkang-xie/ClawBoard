// Agent Dashboard Configuration
// 使用环境变量，前端通过 import.meta.env 访问

// BFF Base URL - 用于前端 API 调用
// 开发环境默认指向本地 BFF
export const BFF_BASE = import.meta.env.VITE_BFF_BASE || 'http://127.0.0.1:18902'

// Gateway WebSocket URL
export const GATEWAY_WS_URL = import.meta.env.VITE_GATEWAY_WS_URL || 'ws://localhost:18789'

// Gateway Token (可选)
export const GATEWAY_TOKEN = import.meta.env.VITE_GATEWAY_TOKEN || ''

// 是否为开发环境
export const isDev = import.meta.env.DEV
