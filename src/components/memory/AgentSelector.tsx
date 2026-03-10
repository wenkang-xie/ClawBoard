import { useState } from 'react'
import { useAgentsList, AgentsListResponse } from '../../hooks/useMemory'

interface AgentSelectorProps {
  selectedAgentId: string | null
  onAgentChange: (agentId: string | null) => void
}

export function AgentSelector({ selectedAgentId, onAgentChange }: AgentSelectorProps) {
  const { data, isLoading, error } = useAgentsList()
  const [isOpen, setIsOpen] = useState(false)

  const agents = data?.agents || []
  const displayLabel = selectedAgentId 
    ? `Agent: ${selectedAgentId}` 
    : 'Default Workspace'

  const handleSelect = (agentId: string | null) => {
    onAgentChange(agentId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors
          ${selectedAgentId 
            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 hover:bg-indigo-600/30' 
            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <span className="text-base">🤖</span>
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`
                w-full text-left px-3 py-2 rounded text-sm transition-colors
                ${!selectedAgentId ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}
              `}
            >
              🏠 Default Workspace
            </button>
            
            {agents.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="px-3 py-1 text-xs text-gray-500">Available Agents</p>
                {agents.map(agent => (
                  <button
                    key={agent}
                    type="button"
                    onClick={() => handleSelect(agent)}
                    className={`
                      w-full text-left px-3 py-2 rounded text-sm transition-colors
                      ${selectedAgentId === agent 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                      }
                    `}
                  >
                    🤖 {agent}
                  </button>
                ))}
              </div>
            )}

            {agents.length === 0 && !isLoading && (
              <p className="px-3 py-2 text-xs text-gray-500">
                No agent directories found
              </p>
            )}

            {error && (
              <p className="px-3 py-2 text-xs text-red-400">
                Failed to load agents
              </p>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
