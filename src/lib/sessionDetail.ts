import { SessionData } from '../hooks/useSessions'
import { RunRecord } from '../hooks/useFileData'

export interface ParsedSessionKey {
  raw: string
  scope: string
  agentId: string
  channel: string
  chatType: string
  target: string
}

export function parseSessionKey(key: string): ParsedSessionKey {
  const parts = key.split(':')

  if (parts.length >= 5) {
    return {
      raw: key,
      scope: parts[0] || 'unknown',
      agentId: parts[1] || 'unknown',
      channel: parts[2] || 'unknown',
      chatType: parts[3] || 'unknown',
      target: parts.slice(4).join(':') || '-',
    }
  }

  if (parts[0] === 'agent' && parts[2] === 'subagent') {
    return {
      raw: key,
      scope: 'agent',
      agentId: parts[1] || 'unknown',
      channel: 'subagent',
      chatType: 'worker',
      target: parts.slice(3).join(':') || '-',
    }
  }

  return {
    raw: key,
    scope: parts[0] || 'unknown',
    agentId: parts[1] || 'unknown',
    channel: parts[2] || 'unknown',
    chatType: parts[3] || 'unknown',
    target: parts.slice(4).join(':') || '-',
  }
}

export function normalizeTimestamp(ts?: number): number | undefined {
  if (!ts) return undefined
  // Some payloads may return seconds-level timestamps
  return ts < 1_000_000_000_000 ? ts * 1000 : ts
}

export function getSessionStatus(session?: SessionData): {
  status: 'running' | 'done' | 'error' | 'warning'
  label: string
  hint?: string
} {
  if (!session) {
    return {
      status: 'warning',
      label: '未知',
      hint: '未在 sessions.list 中找到该会话',
    }
  }

  const updatedAt = normalizeTimestamp(session.updatedAt) || 0
  const ageMs = Date.now() - updatedAt

  if (ageMs <= 2 * 60_000) {
    return { status: 'running', label: '活跃中', hint: '最近 2 分钟有更新' }
  }

  if (ageMs <= 30 * 60_000) {
    return { status: 'done', label: '稳定', hint: '近 30 分钟内无异常' }
  }

  return { status: 'warning', label: '可能已空闲', hint: '超过 30 分钟未更新' }
}

export function splitRelations(runs: RunRecord[], sessionKey: string) {
  const incoming = runs.filter(r => r.childSessionKey === sessionKey)
  const outgoing = runs.filter(r => r.requesterSessionKey === sessionKey)
  return { incoming, outgoing }
}
