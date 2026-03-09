import { useQuery } from '@tanstack/react-query'

const BFF_BASE = 'http://127.0.0.1:18902'

export interface RunRecord {
  runId: string
  childSessionKey: string
  requesterSessionKey: string
  requesterDisplayKey?: string
  task?: string
  cleanup?: string
  spawnMode?: string
  model?: string
  createdAt: number
  startedAt?: number
  endedAt?: number
  outcome?: {
    status: 'ok' | 'error' | null
    error?: string
  }
  endedReason?: string
}

export interface RunsData {
  version: number
  runs: Record<string, RunRecord>
}

export interface BffRunsResponse {
  ok: boolean
  ts: number
  source: string
  partial?: boolean
  warnings?: string[]
  data: RunsData
}

// ── BFF Task Types ────────────────────────────────────────────────────────────

export interface BffCheckbox {
  checked: boolean
  text: string
}

export interface BffTask {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  meta: Record<string, string>
  checkboxes: BffCheckbox[]
  rawText: string
}

export interface BffTasksResponse {
  ok: boolean
  ts: number
  source: string
  count: number
  tasks: BffTask[]
  error?: string
}

// ── useRunsJson → BFF /api/runs ───────────────────────────────────────────────

export function useRunsJson() {
  return useQuery<RunsData>({
    queryKey: ['runs-json-bff'],
    queryFn: async (): Promise<RunsData> => {
      const resp = await fetch(`${BFF_BASE}/api/runs`)
      if (!resp.ok) throw new Error(`BFF /api/runs HTTP ${resp.status}`)
      const data: BffRunsResponse = await resp.json()
      if (!data.ok) throw new Error(data.warnings?.[0] || 'BFF runs error')
      return data.data || { version: 1, runs: {} }
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 10_000,
  })
}

// ── useRunningTasksMd → BFF /api/tasks ───────────────────────────────────────

export function useRunningTasksMd() {
  return useQuery<string>({
    queryKey: ['running-tasks-md-bff'],
    queryFn: async (): Promise<string> => {
      const resp = await fetch(`${BFF_BASE}/api/tasks`)
      if (!resp.ok) throw new Error(`BFF /api/tasks HTTP ${resp.status}`)
      const data: BffTasksResponse = await resp.json()
      if (!data.ok) throw new Error(data.error || 'BFF error')
      // Return raw markdown reconstructed from tasks (for existing KanbanBoard parser)
      return data.tasks.map(t => t.rawText).join('\n\n')
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 25_000,
  })
}

// ── useBffTasks — returns parsed tasks directly ───────────────────────────────

export function useBffTasks() {
  return useQuery<BffTasksResponse>({
    queryKey: ['bff-tasks'],
    queryFn: async (): Promise<BffTasksResponse> => {
      const resp = await fetch(`${BFF_BASE}/api/tasks`)
      if (!resp.ok) throw new Error(`BFF /api/tasks HTTP ${resp.status}`)
      return resp.json() as Promise<BffTasksResponse>
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 25_000,
  })
}
