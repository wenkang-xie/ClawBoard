import { useQuery } from '@tanstack/react-query'

const BFF_BASE = 'http://127.0.0.1:18902'

export type MemoryCategory = 'index' | 'daily' | 'catalog' | 'archive' | 'note'

export interface MemoryFileItem {
  type: 'file'
  name: string
  path: string
  relativePath: string
  sizeBytes: number
  modifiedAt: number
  category: MemoryCategory
  tags: string[]
}

interface MemoryDirectoryNode {
  type: 'directory'
  name: string
  path: string
  relativePath: string
  files: MemoryTreeNode[]
}

type MemoryTreeNode = MemoryFileItem | MemoryDirectoryNode

interface MemoryIndexResponse {
  ok: boolean
  ts: number
  source: string
  partial?: boolean
  warnings?: string[]
  files?: MemoryTreeNode[]
  flatFiles?: MemoryFileItem[]
  error?: { code?: string; message?: string }
}

export interface MemoryIndexData {
  ts: number
  source: string
  partial: boolean
  warnings: string[]
  files: MemoryFileItem[]
  tree: MemoryTreeNode[]
}

interface MemoryHeading {
  level: number
  text: string
}

export interface MemoryFilePreviewData {
  path: string
  relativePath: string
  name: string
  sizeBytes: number
  modifiedAt: number
  lineCount: number
  truncated: boolean
  preview: string
  headings: MemoryHeading[]
  tags: string[]
}

interface MemoryFileResponse {
  ok: boolean
  ts: number
  source: string
  data?: MemoryFilePreviewData
  error?: { code?: string; message?: string }
}

function inferCategory(file: Pick<MemoryFileItem, 'name' | 'relativePath'>): MemoryCategory {
  if (file.name === 'MEMORY.md') return 'index'
  if (/^\d{4}-\d{2}-\d{2}\.md$/.test(file.name)) return 'daily'
  if (file.relativePath.startsWith('archive/')) return 'archive'
  if (['projects.md', 'infra.md', 'lessons.md', 'promotions.md'].includes(file.name)) return 'catalog'
  return 'note'
}

function normalizeFile(item: MemoryFileItem): MemoryFileItem {
  const category = item.category || inferCategory(item)
  const mergedTags = new Set([...(item.tags || []), category])

  const dateMatch = item.name.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/)
  if (dateMatch) mergedTags.add(`${dateMatch[1]}-${dateMatch[2]}`)

  return {
    ...item,
    category,
    tags: [...mergedTags],
  }
}

function flattenTree(nodes: MemoryTreeNode[] = []): MemoryFileItem[] {
  const files: MemoryFileItem[] = []

  for (const node of nodes) {
    if (!node) continue

    if (node.type === 'file') {
      files.push(normalizeFile(node))
      continue
    }

    if (node.type === 'directory' && Array.isArray(node.files)) {
      files.push(...flattenTree(node.files))
    }
  }

  return files
}

export function useMemoryIndex() {
  return useQuery<MemoryIndexData>({
    queryKey: ['memory-index-bff'],
    queryFn: async () => {
      const resp = await fetch(`${BFF_BASE}/api/memory`)
      const data = (await resp.json()) as MemoryIndexResponse

      if (!resp.ok || !data.ok) {
        throw new Error(data?.error?.message || `BFF /api/memory HTTP ${resp.status}`)
      }

      const flat = Array.isArray(data.flatFiles) && data.flatFiles.length > 0
        ? data.flatFiles.map(normalizeFile)
        : flattenTree(data.files || [])

      const files = flat.sort((a, b) => b.modifiedAt - a.modifiedAt)

      return {
        ts: data.ts,
        source: data.source,
        partial: Boolean(data.partial),
        warnings: data.warnings || [],
        files,
        tree: data.files || [],
      }
    },
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    staleTime: 12_000,
    retry: 1,
  })
}

export function useMemoryFilePreview(filePath: string | null) {
  return useQuery<MemoryFilePreviewData>({
    queryKey: ['memory-file-preview', filePath],
    queryFn: async () => {
      if (!filePath) throw new Error('missing file path')

      const resp = await fetch(
        `${BFF_BASE}/api/memory/file?path=${encodeURIComponent(filePath)}&maxChars=12000`
      )
      const data = (await resp.json()) as MemoryFileResponse

      if (!resp.ok || !data.ok || !data.data) {
        throw new Error(data?.error?.message || `BFF /api/memory/file HTTP ${resp.status}`)
      }

      return data.data
    },
    enabled: Boolean(filePath),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    retry: 1,
  })
}

// ── v1 hooks (Sprint2) ────────────────────────────────────────────────────────

export type V1MemoryCategory = 'index' | 'daily' | 'archive' | 'catalog' | 'note'

export interface V1MemoryFileNode {
  type: 'file'
  name: string
  ext: string
  path: string
  relativePath: string
  sizeBytes: number
  modifiedAt: number
  previewable: boolean
  category: V1MemoryCategory
  tags: string[]
}

export interface V1MemoryDirNode {
  type: 'directory'
  name: string
  path: string
  relativePath: string
  children: V1MemoryTreeNode[]
  fileCount: number
}

export type V1MemoryTreeNode = V1MemoryFileNode | V1MemoryDirNode

export interface V1MemoryTreeData {
  tree: V1MemoryTreeNode[]
  totalFiles: number
  partial: boolean
  warnings: string[]
}

export interface V1MemoryListData {
  files: V1MemoryFileNode[]
  total: number
  partial: boolean
  warnings: string[]
}

export interface V1MemoryHeading {
  level: number
  text: string
}

export interface V1MemoryFileDetail {
  path: string
  relativePath: string
  name: string
  ext: string
  sizeBytes: number
  modifiedAt: number
  lineCount: number
  truncated: boolean
  preview: string
  headings?: V1MemoryHeading[]
  tags?: string[]
}

export function useMemoryTree() {
  return useQuery<V1MemoryTreeData>({
    queryKey: ['memory-v1-tree'],
    queryFn: async (): Promise<V1MemoryTreeData> => {
      const resp = await fetch(`${BFF_BASE}/api/v1/memory/tree`)
      if (!resp.ok) throw new Error(`BFF /api/v1/memory/tree HTTP ${resp.status}`)
      const json = await resp.json()
      if (!json.ok) throw new Error(json.error?.message || 'memory tree error')
      return json.data as V1MemoryTreeData
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 20_000,
    retry: 1,
  })
}

export function useMemoryList(sort: 'modified' | 'name' = 'modified', category?: V1MemoryCategory) {
  return useQuery<V1MemoryListData>({
    queryKey: ['memory-v1-list', sort, category ?? ''],
    queryFn: async (): Promise<V1MemoryListData> => {
      const params = new URLSearchParams({ sort })
      if (category) params.set('category', category)
      const resp = await fetch(`${BFF_BASE}/api/v1/memory/list?${params}`)
      if (!resp.ok) throw new Error(`BFF /api/v1/memory/list HTTP ${resp.status}`)
      const json = await resp.json()
      if (!json.ok) throw new Error(json.error?.message || 'memory list error')
      return json.data as V1MemoryListData
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 20_000,
    retry: 1,
  })
}

export function useMemoryPreview(filePath: string | null, maxChars = 12_000) {
  return useQuery<V1MemoryFileDetail>({
    queryKey: ['memory-v1-preview', filePath, maxChars],
    enabled: !!filePath,
    queryFn: async (): Promise<V1MemoryFileDetail> => {
      const params = new URLSearchParams({ path: filePath!, maxChars: String(maxChars) })
      const resp = await fetch(`${BFF_BASE}/api/v1/memory/preview?${params}`)
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body?.error?.message || `HTTP ${resp.status}`)
      }
      const json = await resp.json()
      if (!json.ok) throw new Error(json.error?.message || 'preview error')
      return json.data as V1MemoryFileDetail
    },
    staleTime: 15_000,
    retry: 1,
  })
}

export function useMemoryDetail(filePath: string | null, maxChars = 60_000) {
  return useQuery<V1MemoryFileDetail>({
    queryKey: ['memory-v1-detail', filePath, maxChars],
    enabled: !!filePath,
    queryFn: async (): Promise<V1MemoryFileDetail> => {
      const params = new URLSearchParams({ path: filePath!, maxChars: String(maxChars) })
      const resp = await fetch(`${BFF_BASE}/api/v1/memory/detail?${params}`)
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body?.error?.message || `HTTP ${resp.status}`)
      }
      const json = await resp.json()
      if (!json.ok) throw new Error(json.error?.message || 'detail error')
      return json.data as V1MemoryFileDetail
    },
    staleTime: 15_000,
    retry: 1,
  })
}
