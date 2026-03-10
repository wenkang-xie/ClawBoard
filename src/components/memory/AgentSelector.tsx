import { V1MemoryAgentSource } from '../../hooks/useMemory'

interface AgentSelectorProps {
  agents: V1MemoryAgentSource[]
  selectedAgentId: string
  onAgentChange: (agentId: string) => void
  loading?: boolean
}

function buildStatusText(agent: V1MemoryAgentSource) {
  const parts: string[] = []
  if (agent.memoryDirExists) parts.push('memory')
  if (agent.indexFileExists) parts.push('index')
  if (agent.sqliteExists) parts.push('sqlite')
  return parts.length > 0 ? parts.join(' · ') : '未发现 memory 数据'
}

export function AgentSelector({ agents, selectedAgentId, onAgentChange, loading }: AgentSelectorProps) {
  const selected = agents.find(agent => agent.agentId === selectedAgentId) || agents[0]

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 min-w-[260px]">
      <label className="text-[11px] uppercase tracking-wide text-gray-500">Memory Source</label>
      <select
        value={selectedAgentId}
        onChange={e => onAgentChange(e.target.value)}
        disabled={loading || agents.length === 0}
        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-primary-500 focus:outline-none"
      >
        {agents.map(agent => (
          <option key={agent.agentId} value={agent.agentId}>
            {agent.label} ({agent.agentId})
          </option>
        ))}
      </select>

      {selected && (
        <div className="space-y-1 text-[11px] text-gray-500">
          <p className="truncate">{selected.workspaceDir}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded px-1.5 py-0.5 ${selected.available ? 'bg-emerald-900/30 text-emerald-300' : 'bg-yellow-900/30 text-yellow-200'}`}>
              {selected.available ? 'ready' : 'degraded'}
            </span>
            <span>{buildStatusText(selected)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
