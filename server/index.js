#!/usr/bin/env node
// Agent Dashboard BFF - Node.js 原生 http，无重框架依赖
import http from 'http'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const PORT = 18902
const OPENCLAW_HOME = path.join(
  process.env.HOME || '/Users/wenkang',
  '.openclaw'
)
const TASKS_FILE = path.join(OPENCLAW_HOME, 'workspace/tasks/running_tasks.md')
const MEMORY_DIR = path.join(OPENCLAW_HOME, 'workspace/memory')
const SUBAGENT_RUNS_FILE = path.join(OPENCLAW_HOME, 'subagents/runs.json')
const AGENTS_DIR = path.join(OPENCLAW_HOME, 'agents')

const SESSION_DETAIL_TTL_MS = 8_000
const LOCAL_INDEX_TTL_MS = 4_000
const sessionDetailCache = new Map()
let runsCache = { expireAt: 0, data: null }
let sessionRegistryCache = { expireAt: 0, data: null }

// ── Markdown Task Parser ──────────────────────────────────────────────────────

function parseTasksMd(md) {
  const tasks = []
  const sections = md.split(/(?=^##\s)/m).filter(s => s.trim())

  for (const section of sections) {
    const lines = section.split('\n')
    const headerLine = lines[0] || ''
    const match = headerLine.match(/^##\s+(.+)/)
    if (!match) continue

    const title = match[1].trim()
    const id = `md-${title.replace(/[^\w]+/g, '-').toLowerCase()}`

    // Parse key-value meta lines
    const meta = {}
    for (const line of lines) {
      const kvMatch = line.match(/^\s*-\s+\*\*([^*]+)\*\*:\s*(.+)/)
      if (kvMatch) {
        meta[kvMatch[1].trim().toLowerCase()] = kvMatch[2].trim()
      }
    }

    // Parse checkboxes
    const checkboxes = []
    for (const line of lines) {
      const cbMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)/)
      if (cbMatch) {
        checkboxes.push({ checked: cbMatch[1] !== ' ', text: cbMatch[2].trim() })
      }
    }

    // Status detection
    let status = meta['status'] || 'todo'
    if (status === 'running' || status === 'in progress') status = 'in_progress'
    if (status === 'blocked') status = 'blocked'
    if (status === 'done' || status === 'completed') status = 'done'
    if (!['todo', 'in_progress', 'done', 'blocked'].includes(status)) {
      const checkedCount = checkboxes.filter(c => c.checked).length
      if (checkboxes.length === 0) {
        status = 'todo'
      } else if (checkedCount === checkboxes.length) {
        status = 'done'
      } else if (checkedCount > 0) {
        status = 'in_progress'
      } else {
        status = 'todo'
      }
    }

    tasks.push({
      id,
      title,
      status,
      meta,
      checkboxes,
      rawText: section.trim(),
    })
  }

  return tasks
}

// ── Memory Directory Scanner ──────────────────────────────────────────────────

function scanMemoryDir(dir) {
  const files = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const stat = fs.statSync(fullPath)
        files.push({
          name: entry.name,
          path: fullPath,
          sizeBytes: stat.size,
          modifiedAt: stat.mtimeMs,
        })
      } else if (entry.isDirectory()) {
        const subFiles = []
        try {
          const subEntries = fs.readdirSync(fullPath, { withFileTypes: true })
          for (const sub of subEntries) {
            if (sub.isFile() && sub.name.endsWith('.md')) {
              const subPath = path.join(fullPath, sub.name)
              const subStat = fs.statSync(subPath)
              subFiles.push({
                name: sub.name,
                path: subPath,
                sizeBytes: subStat.size,
                modifiedAt: subStat.mtimeMs,
              })
            }
          }
        } catch {
          // skip unreadable directory
        }
        files.push({
          name: entry.name,
          type: 'directory',
          path: fullPath,
          files: subFiles,
        })
      }
    }
  } catch (err) {
    return { error: String(err), files: [] }
  }
  return { files }
}

// ── Session BFF Helpers ───────────────────────────────────────────────────────

function parseIntWithBounds(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function decodeSessionKey(raw) {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

function trimText(text, maxChars) {
  const value = String(text || '')
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}…`
}

async function gatewayCall(method, params = {}, timeoutMs = 12_000) {
  const args = [
    'gateway',
    'call',
    method,
    '--params',
    JSON.stringify(params),
    '--json',
    '--timeout',
    String(timeoutMs),
  ]

  try {
    const { stdout } = await execFileAsync('openclaw', args, {
      maxBuffer: 8 * 1024 * 1024,
    })
    return JSON.parse(stdout)
  } catch (error) {
    const stderr = String(error?.stderr || '').trim()
    const stdout = String(error?.stdout || '').trim()
    const message = stderr || stdout || error?.message || `gateway call failed: ${method}`
    throw new Error(message)
  }
}

function normalizeEventsFromLogs(logs, maxChars) {
  return (logs || []).map(item => ({
    role: String(item?.role || 'unknown'),
    content: trimText(item?.content, maxChars),
    timestamp: typeof item?.timestamp === 'number' ? item.timestamp : undefined,
  }))
}

function normalizeEventsFromPreview(previewItems, maxChars) {
  return (previewItems || []).map(item => ({
    role: String(item?.role || 'unknown'),
    content: trimText(item?.text, maxChars),
  }))
}

function getDetailCache(key) {
  const found = sessionDetailCache.get(key)
  if (!found) return null
  if (found.expireAt <= Date.now()) {
    sessionDetailCache.delete(key)
    return null
  }
  return found.data
}

function setDetailCache(key, data) {
  sessionDetailCache.set(key, {
    expireAt: Date.now() + SESSION_DETAIL_TTL_MS,
    data,
  })
}

function parseAgentIdFromSessionKey(key) {
  const parts = String(key || '').split(':')
  return parts[0] === 'agent' ? (parts[1] || 'unknown') : 'unknown'
}

function parseSessionTargetToken(key) {
  const parts = String(key || '').split(':')
  if (parts.length >= 5) return parts.slice(4).join(':')
  return ''
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function getCachedLocal(cache, loader) {
  if (cache.data && cache.expireAt > Date.now()) return cache.data
  const data = loader()
  cache.data = data
  cache.expireAt = Date.now() + LOCAL_INDEX_TTL_MS
  return data
}

function loadRunsIndex() {
  return getCachedLocal(runsCache, () => {
    try {
      const data = readJsonFile(SUBAGENT_RUNS_FILE)
      return {
        ok: true,
        source: SUBAGENT_RUNS_FILE,
        version: Number(data?.version || 1),
        runs: data?.runs && typeof data.runs === 'object' ? data.runs : {},
      }
    } catch (error) {
      return {
        ok: false,
        source: SUBAGENT_RUNS_FILE,
        version: 1,
        runs: {},
        warning: String(error?.message || error),
      }
    }
  })
}

function loadSessionRegistry() {
  return getCachedLocal(sessionRegistryCache, () => {
    const entries = new Map()
    const warnings = []

    try {
      const agents = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
      for (const agent of agents) {
        if (!agent.isDirectory()) continue
        const storePath = path.join(AGENTS_DIR, agent.name, 'sessions', 'sessions.json')
        if (!fs.existsSync(storePath)) continue

        try {
          const data = readJsonFile(storePath)
          for (const [sessionKey, value] of Object.entries(data || {})) {
            if (!sessionKey || !value || typeof value !== 'object') continue
            const prev = entries.get(sessionKey) || {}
            const next = { ...prev, ...value, key: sessionKey, __sourceFile: storePath }
            const prevUpdated = Number(prev.updatedAt || 0)
            const nextUpdated = Number(next.updatedAt || 0)
            if (!entries.has(sessionKey) || nextUpdated >= prevUpdated) {
              entries.set(sessionKey, next)
            }
          }
        } catch (error) {
          warnings.push(`${storePath}: ${String(error?.message || error)}`)
        }
      }
    } catch (error) {
      warnings.push(`agents dir scan failed: ${String(error?.message || error)}`)
    }

    return { entries, warnings }
  })
}

function mergeSessionIndex(listSessions = [], registryEntries = new Map()) {
  const index = new Map()

  for (const session of listSessions || []) {
    if (!session?.key) continue
    index.set(session.key, {
      ...session,
      agentId: session.agentId || parseAgentIdFromSessionKey(session.key),
    })
  }

  for (const [sessionKey, entry] of registryEntries.entries()) {
    const existing = index.get(sessionKey) || {}
    index.set(sessionKey, {
      ...entry,
      ...existing,
      key: sessionKey,
      agentId: existing.agentId || entry.agentId || parseAgentIdFromSessionKey(sessionKey),
      channel: existing.channel || entry.channel || entry.lastChannel || entry?.deliveryContext?.channel,
      groupChannel: existing.groupChannel || entry.groupChannel,
      space: existing.space || entry.space,
      updatedAt: existing.updatedAt || entry.updatedAt,
      sessionId: existing.sessionId || entry.sessionId,
      displayName: existing.displayName || entry.displayName,
      lastChannel: existing.lastChannel || entry.lastChannel,
      lastTo: existing.lastTo || entry.lastTo,
      lastAccountId: existing.lastAccountId || entry.lastAccountId,
      spawnedBy: existing.spawnedBy || entry.spawnedBy,
      groupId: existing.groupId || entry.groupId,
    })
  }

  return index
}

function pickSessionSummary(sessionKey, sessionIndex) {
  const session = sessionIndex.get(sessionKey) || {}
  return {
    key: sessionKey,
    displayName: session.displayName,
    agentId: session.agentId || parseAgentIdFromSessionKey(sessionKey),
    channel: session.channel || session.lastChannel,
    groupChannel: session.groupChannel,
    space: session.space,
    updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : undefined,
    sessionId: session.sessionId,
    model: session.model,
    modelProvider: session.modelProvider,
  }
}

function normalizeRunOutcome(run) {
  if (run?.outcome?.status === 'ok' || run?.outcome?.status === 'error') return run.outcome.status
  if (run?.endedAt) return 'unknown'
  return 'running'
}

function buildRunRelation(direction, run, sessionIndex) {
  const sessionKey = direction === 'incoming' ? run.requesterSessionKey : run.childSessionKey
  const durationMs = run.startedAt && run.endedAt ? Math.max(0, run.endedAt - run.startedAt) : undefined

  return {
    id: `${direction}:${run.runId}`,
    kind: 'run',
    direction,
    sessionKey,
    session: pickSessionSummary(sessionKey, sessionIndex),
    runId: run.runId,
    source: 'subagents.runs.json',
    derived: false,
    confidence: 'high',
    reason: direction === 'incoming' ? '命中 childSessionKey → requesterSessionKey' : '命中 requesterSessionKey → childSessionKey',
    task: run.task,
    status: normalizeRunOutcome(run),
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    durationMs,
    outcome: run.outcome,
  }
}

function buildSessionRelation({ direction, sessionKey, sessionIndex, source, reason, confidence = 'medium', derived = true, status, createdAt, updatedAt }) {
  const session = pickSessionSummary(sessionKey, sessionIndex)
  return {
    id: `${direction}:${source}:${sessionKey}`,
    kind: 'session',
    direction,
    sessionKey,
    session,
    source,
    derived,
    confidence,
    reason,
    status: status || 'unknown',
    createdAt,
    updatedAt: updatedAt || session.updatedAt,
  }
}

function sortByRecent(items) {
  return [...items].sort((a, b) => {
    const aTs = a.createdAt || a.updatedAt || a.startedAt || 0
    const bTs = b.createdAt || b.updatedAt || b.startedAt || 0
    return bTs - aTs
  })
}

function limitRelations(items, limit) {
  return sortByRecent(items).slice(0, limit)
}

function buildWeakRelatedRelations(sessionKey, targetSession, sessionIndex, blockedKeys, limit) {
  const related = []
  const targetToken = parseSessionTargetToken(sessionKey)
  const targetLastTo = targetSession?.lastTo
  const targetGroupId = targetSession?.groupId
  const targetUpdatedAt = Number(targetSession?.updatedAt || 0)

  for (const candidate of sessionIndex.values()) {
    if (!candidate?.key || candidate.key === sessionKey || blockedKeys.has(candidate.key)) continue

    let score = 0
    const reasons = []

    if (targetGroupId && candidate.lastTo === `channel:${targetGroupId}`) {
      score += 70
      reasons.push('命中 groupId ↔ 主线程 channel')
    }
    if (targetLastTo && candidate.groupId && targetLastTo === `channel:${candidate.groupId}`) {
      score += 70
      reasons.push('命中主线程 channel ↔ 子会话 groupId')
    }
    if (targetGroupId && candidate.groupId === targetGroupId) {
      score += 55
      reasons.push('同 groupId')
    }
    if (targetToken && candidate.groupId === targetToken) {
      score += 55
      reasons.push('目标 token 命中 groupId')
    }
    if (targetLastTo && candidate.lastTo && targetLastTo === candidate.lastTo && targetSession?.channel === candidate.channel) {
      score += 45
      reasons.push('同 channel 目标')
    }
    if (targetSession?.space && candidate.space === targetSession.space) score += 8
    if (targetSession?.groupChannel && candidate.groupChannel === targetSession.groupChannel) score += 8
    if (targetSession?.channel && candidate.channel === targetSession.channel) score += 4

    const candidateUpdatedAt = Number(candidate.updatedAt || 0)
    const ageDiff = targetUpdatedAt && candidateUpdatedAt ? Math.abs(candidateUpdatedAt - targetUpdatedAt) : Number.POSITIVE_INFINITY
    if (ageDiff <= 10 * 60_000) {
      score += 18
      reasons.push('更新时间接近')
    } else if (ageDiff <= 2 * 60 * 60_000) {
      score += 8
    }

    if (score < 40) continue

    related.push(buildSessionRelation({
      direction: 'related',
      sessionKey: candidate.key,
      sessionIndex,
      source: 'session-registry',
      reason: reasons.join(' · ') || '共享上下文线索',
      confidence: score >= 70 ? 'high' : 'medium',
      derived: true,
      updatedAt: candidateUpdatedAt || undefined,
    }))
  }

  return limitRelations(related, limit)
}

async function loadSessionRelations(sessionKey, { relationLimit, relatedLimit, listSessions }) {
  const warnings = []
  const runsIndex = loadRunsIndex()
  if (!runsIndex.ok && runsIndex.warning) warnings.push(`runs: ${runsIndex.warning}`)

  const registry = loadSessionRegistry()
  warnings.push(...(registry.warnings || []).map(item => `session-registry: ${item}`))

  const sessionIndex = mergeSessionIndex(listSessions, registry.entries)
  const targetSession = sessionIndex.get(sessionKey) || registry.entries.get(sessionKey) || {}
  const runs = Object.values(runsIndex.runs || {})

  const incoming = limitRelations(
    runs
      .filter(run => run.childSessionKey === sessionKey)
      .map(run => buildRunRelation('incoming', run, sessionIndex)),
    relationLimit
  )

  const outgoing = limitRelations(
    runs
      .filter(run => run.requesterSessionKey === sessionKey)
      .map(run => buildRunRelation('outgoing', run, sessionIndex)),
    relationLimit
  )

  const incomingKeys = new Set(incoming.map(item => item.sessionKey))
  const outgoingKeys = new Set(outgoing.map(item => item.sessionKey))

  if (incoming.length === 0 && targetSession?.spawnedBy && !incomingKeys.has(targetSession.spawnedBy)) {
    incoming.push(buildSessionRelation({
      direction: 'incoming',
      sessionKey: targetSession.spawnedBy,
      sessionIndex,
      source: 'session-registry',
      reason: '从 sessions.json 的 spawnedBy 反推上游',
      confidence: 'medium',
      derived: true,
      updatedAt: targetSession.updatedAt,
    }))
  }

  if (outgoing.length === 0) {
    const spawnedChildren = []
    for (const entry of registry.entries.values()) {
      if (!entry?.key || entry.key === sessionKey) continue
      if (entry.spawnedBy !== sessionKey) continue
      if (outgoingKeys.has(entry.key)) continue
      spawnedChildren.push(buildSessionRelation({
        direction: 'outgoing',
        sessionKey: entry.key,
        sessionIndex,
        source: 'session-registry',
        reason: '从 sessions.json 的 spawnedBy 反向聚合下游',
        confidence: 'medium',
        derived: true,
        updatedAt: entry.updatedAt,
      }))
    }
    outgoing.push(...limitRelations(spawnedChildren, relationLimit))
  }

  const blockedKeys = new Set([sessionKey])
  for (const item of incoming) blockedKeys.add(item.sessionKey)
  for (const item of outgoing) blockedKeys.add(item.sessionKey)

  const related = buildWeakRelatedRelations(sessionKey, targetSession, sessionIndex, blockedKeys, relatedLimit)
  const weakInferenceUsed = [...incoming, ...outgoing, ...related].some(item => item.derived)

  return {
    sessionKey,
    incoming: limitRelations(incoming, relationLimit),
    outgoing: limitRelations(outgoing, relationLimit),
    related,
    weakInferenceUsed,
    partial: warnings.length > 0,
    warnings,
  }
}

async function loadSessionEvents(sessionKey, { eventsLimit, previewLimit, maxChars }) {
  const logsPromise = gatewayCall('sessions.usage.logs', {
    key: sessionKey,
    limit: eventsLimit,
  })
  const previewPromise = gatewayCall('sessions.preview', {
    keys: [sessionKey],
    limit: previewLimit,
    maxChars,
  })

  const [logsResult, previewResult] = await Promise.allSettled([logsPromise, previewPromise])

  if (logsResult.status === 'fulfilled' && Array.isArray(logsResult.value?.logs) && logsResult.value.logs.length > 0) {
    return {
      events: normalizeEventsFromLogs(logsResult.value.logs, maxChars),
      source: 'sessions.usage.logs',
      warnings: [],
    }
  }

  if (previewResult.status === 'fulfilled') {
    const preview = previewResult.value?.previews?.find(item => item.key === sessionKey)
    if (preview?.items?.length) {
      return {
        events: normalizeEventsFromPreview(preview.items, maxChars),
        source: 'sessions.preview',
        warnings: logsResult.status === 'rejected' ? [String(logsResult.reason?.message || logsResult.reason)] : [],
      }
    }
  }

  const warnings = []
  if (logsResult.status === 'rejected') warnings.push(String(logsResult.reason?.message || logsResult.reason))
  if (previewResult.status === 'rejected') warnings.push(String(previewResult.reason?.message || previewResult.reason))

  return {
    events: [],
    source: 'none',
    warnings,
  }
}

async function loadSessionDetail(sessionKey, opts) {
  const warnings = []

  const [
    listResult,
    usageResult,
    timeseriesResult,
    eventsResult,
  ] = await Promise.allSettled([
    gatewayCall('sessions.list', {
      limit: 500,
      includeDerivedTitles: true,
      includeLastMessage: true,
    }),
    gatewayCall('sessions.usage', {
      key: sessionKey,
      limit: 1,
    }),
    gatewayCall('sessions.usage.timeseries', {
      key: sessionKey,
    }),
    loadSessionEvents(sessionKey, opts),
  ])

  let session = undefined
  if (listResult.status === 'fulfilled') {
    session = listResult.value?.sessions?.find(s => s.key === sessionKey)
  } else {
    warnings.push(`sessions.list: ${String(listResult.reason?.message || listResult.reason)}`)
  }

  let usage = undefined
  if (usageResult.status === 'fulfilled') {
    usage = usageResult.value?.sessions?.[0]?.usage
  } else {
    warnings.push(`sessions.usage: ${String(usageResult.reason?.message || usageResult.reason)}`)
  }

  let timeseries = undefined
  if (timeseriesResult.status === 'fulfilled' && Array.isArray(timeseriesResult.value?.points)) {
    const points = timeseriesResult.value.points
    const pointLimit = opts.pointLimit
    timeseries = {
      sessionId: timeseriesResult.value?.sessionId,
      points: points.length > pointLimit ? points.slice(-pointLimit) : points,
    }
  } else if (timeseriesResult.status === 'rejected') {
    warnings.push(`sessions.usage.timeseries: ${String(timeseriesResult.reason?.message || timeseriesResult.reason)}`)
  }

  let messages = []
  let eventSource = 'none'
  if (eventsResult.status === 'fulfilled') {
    messages = eventsResult.value.events
    eventSource = eventsResult.value.source
    warnings.push(...(eventsResult.value.warnings || []))
  } else {
    warnings.push(`events: ${String(eventsResult.reason?.message || eventsResult.reason)}`)
  }

  const relations = await loadSessionRelations(sessionKey, {
    relationLimit: opts.relationLimit,
    relatedLimit: opts.relatedLimit,
    listSessions: listResult.status === 'fulfilled' ? listResult.value?.sessions : undefined,
  })
  warnings.push(...(relations.warnings || []).map(item => `relations: ${item}`))

  return {
    sessionKey,
    session,
    messages,
    usage,
    timeseries,
    relations,
    partial: warnings.length > 0,
    eventSource,
    warnings,
  }
}

// ── Request Handler ───────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, statusCode, body) {
  setCors(res)
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body, null, 2))
}

function apiError(res, status, code, message, details) {
  json(res, status, {
    ok: false,
    ts: Date.now(),
    error: {
      code,
      message,
      details,
    },
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  // Preflight
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.writeHead(204)
    res.end()
    return
  }

  // GET /api/tasks
  if (req.method === 'GET' && pathname === '/api/tasks') {
    try {
      const md = fs.readFileSync(TASKS_FILE, 'utf-8')
      const tasks = parseTasksMd(md)
      json(res, 200, {
        ok: true,
        ts: Date.now(),
        source: TASKS_FILE,
        count: tasks.length,
        tasks,
      })
    } catch (err) {
      apiError(res, 500, 'TASKS_READ_FAILED', '读取任务文件失败', String(err))
    }
    return
  }

  // GET /api/memory
  if (req.method === 'GET' && pathname === '/api/memory') {
    const result = scanMemoryDir(MEMORY_DIR)
    json(res, result.error ? 500 : 200, {
      ok: !result.error,
      ts: Date.now(),
      source: MEMORY_DIR,
      ...result,
    })
    return
  }

  // GET /api/runs
  if (req.method === 'GET' && pathname === '/api/runs') {
    const runsIndex = loadRunsIndex()
    json(res, 200, {
      ok: true,
      ts: Date.now(),
      source: runsIndex.source,
      partial: !runsIndex.ok,
      warnings: runsIndex.warning ? [runsIndex.warning] : [],
      data: {
        version: runsIndex.version,
        runs: runsIndex.runs,
      },
    })
    return
  }

  // GET /api/sessions
  if (req.method === 'GET' && pathname === '/api/sessions') {
    try {
      const limit = parseIntWithBounds(url.searchParams.get('limit'), 200, 1, 1000)
      const search = url.searchParams.get('search') || undefined
      const agentId = url.searchParams.get('agentId') || undefined
      const label = url.searchParams.get('label') || undefined

      const result = await gatewayCall('sessions.list', {
        limit,
        search,
        agentId,
        label,
        includeDerivedTitles: true,
        includeLastMessage: true,
      })

      json(res, 200, {
        ok: true,
        ts: Date.now(),
        data: result,
      })
    } catch (err) {
      apiError(res, 502, 'GATEWAY_CALL_FAILED', 'sessions.list 调用失败', String(err))
    }
    return
  }

  const detailMatch = pathname.match(/^\/api\/sessions\/(.+)\/detail$/)
  if (req.method === 'GET' && detailMatch) {
    const sessionKey = decodeSessionKey(detailMatch[1])
    if (!sessionKey) {
      apiError(res, 400, 'INVALID_SESSION_KEY', 'sessionKey 解码失败')
      return
    }

    const eventsLimit = parseIntWithBounds(url.searchParams.get('eventsLimit'), 120, 10, 500)
    const previewLimit = parseIntWithBounds(url.searchParams.get('previewLimit'), 24, 1, 100)
    const maxChars = parseIntWithBounds(url.searchParams.get('maxChars'), 1800, 100, 6000)
    const pointLimit = parseIntWithBounds(url.searchParams.get('pointLimit'), 120, 20, 300)
    const relationLimit = parseIntWithBounds(url.searchParams.get('relationLimit'), 10, 1, 50)
    const relatedLimit = parseIntWithBounds(url.searchParams.get('relatedLimit'), 6, 0, 20)
    const force = url.searchParams.get('force') === '1'

    const cacheKey = `${sessionKey}|e=${eventsLimit}|p=${previewLimit}|c=${maxChars}|t=${pointLimit}|r=${relationLimit}|rr=${relatedLimit}`
    const cached = !force ? getDetailCache(cacheKey) : null

    if (cached) {
      json(res, 200, {
        ok: true,
        ts: Date.now(),
        cache: { hit: true, ttlMs: SESSION_DETAIL_TTL_MS },
        data: cached,
      })
      return
    }

    try {
      const data = await loadSessionDetail(sessionKey, {
        eventsLimit,
        previewLimit,
        maxChars,
        pointLimit,
        relationLimit,
        relatedLimit,
      })

      setDetailCache(cacheKey, data)

      json(res, 200, {
        ok: true,
        ts: Date.now(),
        cache: { hit: false, ttlMs: SESSION_DETAIL_TTL_MS },
        data,
      })
    } catch (err) {
      apiError(res, 502, 'SESSION_DETAIL_FAILED', 'Session detail 聚合失败', String(err))
    }
    return
  }

  const relationsMatch = pathname.match(/^\/api\/sessions\/(.+)\/relations$/)
  if (req.method === 'GET' && relationsMatch) {
    const sessionKey = decodeSessionKey(relationsMatch[1])
    if (!sessionKey) {
      apiError(res, 400, 'INVALID_SESSION_KEY', 'sessionKey 解码失败')
      return
    }

    const relationLimit = parseIntWithBounds(url.searchParams.get('limit'), 10, 1, 50)
    const relatedLimit = parseIntWithBounds(url.searchParams.get('relatedLimit'), 6, 0, 20)

    try {
      let listSessions = undefined
      try {
        const listResult = await gatewayCall('sessions.list', {
          limit: 500,
          includeDerivedTitles: true,
          includeLastMessage: true,
        })
        listSessions = listResult?.sessions
      } catch (error) {
        // list is optional; relations can still fall back to local session registry
      }

      const result = await loadSessionRelations(sessionKey, {
        relationLimit,
        relatedLimit,
        listSessions,
      })

      json(res, 200, {
        ok: true,
        ts: Date.now(),
        data: result,
      })
    } catch (err) {
      apiError(res, 502, 'SESSION_RELATIONS_FAILED', 'Session relations 拉取失败', String(err))
    }
    return
  }

  const eventsMatch = pathname.match(/^\/api\/sessions\/(.+)\/events$/)
  if (req.method === 'GET' && eventsMatch) {
    const sessionKey = decodeSessionKey(eventsMatch[1])
    if (!sessionKey) {
      apiError(res, 400, 'INVALID_SESSION_KEY', 'sessionKey 解码失败')
      return
    }

    const eventsLimit = parseIntWithBounds(url.searchParams.get('limit'), 120, 10, 500)
    const previewLimit = parseIntWithBounds(url.searchParams.get('previewLimit'), 24, 1, 100)
    const maxChars = parseIntWithBounds(url.searchParams.get('maxChars'), 1800, 100, 6000)

    try {
      const result = await loadSessionEvents(sessionKey, {
        eventsLimit,
        previewLimit,
        maxChars,
      })

      json(res, 200, {
        ok: true,
        ts: Date.now(),
        data: {
          sessionKey,
          source: result.source,
          events: result.events,
          partial: result.warnings.length > 0,
          warnings: result.warnings,
        },
      })
    } catch (err) {
      apiError(res, 502, 'SESSION_EVENTS_FAILED', 'Session events 拉取失败', String(err))
    }
    return
  }

  // 404
  apiError(res, 404, 'NOT_FOUND', `Not found: ${pathname}`)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ BFF running at http://127.0.0.1:${PORT}`)
  console.log(`   GET /api/tasks`) 
  console.log(`   GET /api/memory`)
  console.log(`   GET /api/runs`)
  console.log(`   GET /api/sessions`)
  console.log(`   GET /api/sessions/:sessionKey/detail`)
  console.log(`   GET /api/sessions/:sessionKey/relations`)
  console.log(`   GET /api/sessions/:sessionKey/events`)
})
