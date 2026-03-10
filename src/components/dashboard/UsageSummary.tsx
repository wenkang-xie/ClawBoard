import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { UsageData } from '../../hooks/useUsage'
import { formatTokens, formatCost, formatRelativeTime, calculatePercentChange } from '../../lib/utils'

interface UsageSummaryProps {
  usage: UsageData
}

interface TooltipPayload {
  value: number
  name: string
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'tokens' ? formatTokens(p.value) + ' tokens' : formatCost(p.value / 100)}
        </p>
      ))}
    </div>
  )
}

// 日期范围选项
const DATE_RANGE_OPTIONS = [
  { label: '7天', value: 7 },
  { label: '14天', value: 14 },
  { label: '30天', value: 30 },
]

// Mini model breakdown item
function ModelBreakdownItem({ model, provider, tokens, cost, totalTokens }: {
  model: string
  provider: string
  tokens: number
  cost: number
  totalTokens: number
}) {
  const percent = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0
  
  // 简化 model 名称显示
  const displayModel = model.includes('/') ? model.split('/').pop() : model
  
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-300 truncate">{displayModel}</span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs text-gray-500">{provider}</span>
        </div>
        <div className="mt-0.5 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{percent}%</span>
    </div>
  )
}

// Trend indicator component
function TrendIndicator({ current, previous, type = 'tokens' }: { 
  current: number
  previous: number
  type?: 'tokens' | 'cost'
}) {
  const percent = calculatePercentChange(current, previous)
  
  if (percent === null) return null
  
  const isUp = percent > 0
  const isNeutral = percent === 0
  
  return (
    <span className={`text-xs ml-2 ${isNeutral ? 'text-gray-500' : isUp ? 'text-yellow-400' : 'text-green-400'}`}>
      {isNeutral ? '→' : isUp ? '↑' : '↓'}{Math.abs(percent)}%
    </span>
  )
}

export function UsageSummary({ usage }: UsageSummaryProps) {
  const [dateRange, setDateRange] = useState(14)
  
  // Filter data based on date range
  const chartData = useMemo(() => {
    const daily = usage.dailyAggregated || []
    return daily.slice(-dateRange).map(d => ({
      date: d.date.slice(5), // MM-DD
      tokens: d.tokens,
      cost_cents: Math.round((d.cost || 0) * 100),
    }))
  }, [usage.dailyAggregated, dateRange])

  const modelBreakdown = usage.modelBreakdown || []
  const totalTokens = usage.totalTokens || 0
  const totalCost = usage.totalCost || 0
  const updatedAt = usage.updatedAt

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">消耗摘要</h3>
          {updatedAt && (
            <p className="text-xs text-gray-600 mt-0.5">
              更新于 {formatRelativeTime(updatedAt)}
            </p>
          )}
        </div>
        
        {/* Date range selector */}
        <div className="flex gap-1">
          {DATE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                dateRange === opt.value 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats row */}
      <div className="flex items-baseline gap-6 mb-4">
        <div>
          <p className="text-sm text-gray-400">总 Token</p>
          <p className="text-2xl font-bold text-white">
            {formatTokens(totalTokens)}
            <TrendIndicator 
              current={totalTokens} 
              previous={usage.previousPeriodTokens || 0} 
              type="tokens" 
            />
          </p>
        </div>
        {(totalCost || 0) > 0 && (
          <div>
            <p className="text-sm text-gray-400">总成本</p>
            <p className="text-lg font-semibold text-green-500">
              {formatCost(totalCost)}
              <TrendIndicator 
                current={totalCost} 
                previous={usage.previousPeriodCost || 0} 
                type="cost" 
              />
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => formatTokens(v as number)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="tokens" fill="#6366f1" radius={[3, 3, 0, 0]} name="tokens" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-32 flex items-center justify-center text-gray-600 text-sm">
          暂无使用数据
        </div>
      )}

      {/* Model breakdown - only show if we have data */}
      {modelBreakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Top Models</p>
          <div className="space-y-0.5">
            {modelBreakdown.slice(0, 3).map((m, i) => (
              <ModelBreakdownItem
                key={i}
                model={m.model}
                provider={m.provider}
                tokens={m.tokens}
                cost={m.cost}
                totalTokens={totalTokens}
              />
            ))}
          </div>
        </div>
      )}

      {/* Date range footer */}
      <p className="text-xs text-gray-600 mt-3 text-right">
        数据范围：{usage.startDate} ~ {usage.endDate}
      </p>
    </div>
  )
}
