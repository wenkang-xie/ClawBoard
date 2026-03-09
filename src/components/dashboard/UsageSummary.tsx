import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { UsageData } from '../../hooks/useUsage'
import { formatTokens, formatCost } from '../../lib/utils'

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

export function UsageSummary({ usage }: UsageSummaryProps) {
  const daily = usage.dailyAggregated || []
  
  // Last 14 days for chart
  const chartData = daily.slice(-14).map(d => ({
    date: d.date.slice(5), // MM-DD
    tokens: d.tokens,
    cost_cents: Math.round((d.cost || 0) * 100),
  }))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-semibold text-white">消耗摘要</h3>
        <div className="text-right">
          <p className="text-sm text-gray-400">总计</p>
          <p className="text-lg font-bold text-white">{formatTokens(usage.totalTokens || 0)}</p>
          {(usage.totalCost || 0) > 0 && (
            <p className="text-sm text-green-500">{formatCost(usage.totalCost || 0)}</p>
          )}
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
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
        <div className="h-40 flex items-center justify-center text-gray-600 text-sm">
          暂无使用数据
        </div>
      )}

      <p className="text-xs text-gray-600 mt-2 text-right">
        数据范围：{usage.startDate} ~ {usage.endDate}
      </p>
    </div>
  )
}
