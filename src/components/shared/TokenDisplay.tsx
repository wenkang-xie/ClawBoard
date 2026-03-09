import { formatTokens, formatCost } from '../../lib/utils'

interface TokenDisplayProps {
  tokens?: number
  cost?: number
  className?: string
}

export function TokenDisplay({ tokens, cost, className = '' }: TokenDisplayProps) {
  return (
    <span className={`text-sm text-gray-400 ${className}`}>
      {tokens !== undefined && (
        <span className="text-gray-300">{formatTokens(tokens)} tokens</span>
      )}
      {tokens !== undefined && cost !== undefined && (
        <span className="mx-1 text-gray-600">·</span>
      )}
      {cost !== undefined && cost > 0 && (
        <span className="text-green-500">{formatCost(cost)}</span>
      )}
    </span>
  )
}
