import { RunRecord } from '../../hooks/useFileData'
import { SessionData } from '../../hooks/useSessions'
import { getAgentColor, formatRelativeTime, formatDuration, truncateKey } from '../../lib/utils'
import { StatusBadge } from '../shared/StatusBadge'

interface SessionTreeProps {
  runs: RunRecord[]
  sessions: SessionData[]
}

interface TreeNode {
  sessionKey: string
  session?: SessionData
  children: RunNode[]
}

interface RunNode {
  run: RunRecord
  childSession?: SessionData
  children: RunNode[]
}

function buildTree(runs: RunRecord[], sessions: SessionData[]): TreeNode[] {
  const sessionMap = new Map(sessions.map(s => [s.key, s]))
  
  // Find all child session keys
  const childKeys = new Set(runs.map(r => r.childSessionKey))
  
  // Find root sessions (not a child of any run, and has at least one child run)
  const rootSessionKeys = new Set<string>()
  for (const run of runs) {
    if (!childKeys.has(run.requesterSessionKey)) {
      rootSessionKeys.add(run.requesterSessionKey)
    }
  }

  function buildRunNode(run: RunRecord, visited: Set<string>): RunNode {
    const childSession = sessionMap.get(run.childSessionKey)
    const childRunId = run.childSessionKey

    if (visited.has(childRunId)) {
      return { run, childSession, children: [] }
    }
    visited.add(childRunId)

    const childRuns = runs.filter(r => r.requesterSessionKey === run.childSessionKey)
    const children = childRuns.map(r => buildRunNode(r, visited))

    return { run, childSession, children }
  }

  return Array.from(rootSessionKeys).map(key => {
    const session = sessionMap.get(key)
    const rootRuns = runs.filter(r => r.requesterSessionKey === key)
    const children = rootRuns.map(r => buildRunNode(r, new Set([key])))
    return { sessionKey: key, session, children }
  }).filter(node => node.children.length > 0)
}

function RunNodeView({ node, depth }: { node: RunNode; depth: number }) {
  const run = node.run
  const status = run.outcome?.status
  const badgeStatus = status === 'ok' ? 'done' : status === 'error' ? 'error' : 'running'
  const duration = run.endedAt && run.startedAt ? run.endedAt - run.startedAt : null
  const childAgentId = run.childSessionKey.split(':')[1] || 'unknown'
  const color = getAgentColor(childAgentId)

  return (
    <div style={{ paddingLeft: `${depth * 20}px` }}>
      <div className="flex items-start gap-2 py-2">
        {/* Connector */}
        <div className="flex flex-col items-center mt-1 flex-shrink-0">
          <div className="w-px h-2 bg-gray-700" />
          <div className="w-2 h-2 rounded-full border-2 border-gray-600 bg-gray-900" />
          {node.children.length > 0 && <div className="w-px flex-1 bg-gray-700 mt-1" style={{ minHeight: 16 }} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 mb-2">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-gray-400 truncate">
                    {truncateKey(run.childSessionKey, 45)}
                  </span>
                </div>
                {run.task && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {run.task.slice(0, 120)}{run.task.length > 120 ? '…' : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge status={badgeStatus} size="sm" />
                {duration !== null && (
                  <span className="text-xs text-gray-600">{formatDuration(duration)}</span>
                )}
              </div>
            </div>
            {run.createdAt && (
              <p className="text-xs text-gray-700 mt-1">{formatRelativeTime(run.createdAt)}</p>
            )}
          </div>

          {/* Children */}
          {node.children.map(child => (
            <RunNodeView key={child.run.runId} node={child} depth={0} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SessionTree({ runs, sessions }: SessionTreeProps) {
  const trees = buildTree(runs, sessions)

  if (trees.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-600 text-sm">暂无 Session 流转数据</p>
        <p className="text-gray-700 text-xs mt-1">需要 runs.json 数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {trees.map(tree => {
        const rootAgentId = tree.sessionKey.split(':')[1] || 'main'
        const color = getAgentColor(rootAgentId)

        return (
          <div key={tree.sessionKey} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            {/* Root session */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-mono text-gray-300 truncate">
                  {truncateKey(tree.sessionKey, 55)}
                </p>
                {tree.session?.displayName && (
                  <p className="text-xs text-gray-500">{tree.session.displayName}</p>
                )}
                {tree.session?.updatedAt && (
                  <p className="text-xs text-gray-600">{formatRelativeTime(tree.session.updatedAt)}</p>
                )}
              </div>
              <span className="ml-auto text-xs text-gray-600">{tree.children.length} 个子任务</span>
            </div>

            {/* Children */}
            <div className="border-l-2 border-gray-700 ml-1.5 pl-4">
              {tree.children.map(child => (
                <RunNodeView key={child.run.runId} node={child} depth={0} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
