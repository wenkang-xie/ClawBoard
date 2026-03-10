import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AgentUsageAggregate, ModelUsageAggregate, SessionUsage, UsageData } from '../../hooks/useUsage'
import { calculatePercentChange, formatCost, formatDateShort, formatTokens, getAgentColor } from '../../lib/utils'
import { RefreshStatus } from '../shared/RefreshStatus'

type RangeValue = 7 | 14 | 30 | 'all'

interface UsageSummaryProps {
  usage: UsageData
  lastUpdated?: number
  isRefetching?: boolean
  onManualRefresh?: () => void
  autoRefreshInterval?: number
  errorMessage?: string
}

interface ChartPoint {
  date: string
  fullDate: string
  tokens: number
  cost: number
}

const DATE_RANGE_OPTIONS: Array<{ label: string; value: RangeValue }> = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: 'All', value: 'all' },
]

function parseAgentIdFromSessionKey(sessionKey?: string): string {
  if (!sessionKey) return 'unknown'
  const parts = sessionKey.split(':')
  if (parts[0] === 'agent' && parts[1]) return parts[1]
  return 'unknown'
}

function toDateKey(timestamp?: number): string | null {
  if (!timestamp || Number.isNaN(timestamp)) return null
  return new Date(timestamp).toISOString().slice(0, 10)
}

function formatRangeLabel(range: RangeValue, itemCount: number): string {
  if (range === 'all') return itemCount > 0 ? `全部 ${itemCount} 天` : '全部'
  return `最近 ${range} 天`
}

function formatModelName(model: string): string {
  return model.includes('/') ? model.split('/').pop() || model : model
}

function buildWindowModelBreakdown(
  sessions: SessionUsage[],
  dateSet: Set<string> | null,
  fallback: ModelUsageAggregate[]
): { items: ModelUsageAggregate[]; precise: boolean } {
  if (!dateSet) {
    return { items: fallback, precise: true }
  }

  const modelMap = new Map<string, ModelUsageAggregate>()

  for (const session of sessions) {
    for (const modelUsage of session.usage.dailyModelUsage || []) {
      if (!dateSet.has(modelUsage.date)) continue
      const key = `${modelUsage.provider}:${modelUsage.model}`
      const existing = modelMap.get(key) || {
        provider: modelUsage.provider,
        model: modelUsage.model,
        tokens: 0,
        cost: 0,
        count: 0,
      }

      modelMap.set(key, {
        provider: modelUsage.provider,
        model: modelUsage.model,
        tokens: existing.tokens + modelUsage.tokens,
        cost: existing.cost + modelUsage.cost,
        count: (existing.count || 0) + (modelUsage.count || 0),
      })
    }
  }

  const items = [...modelMap.values()].sort((a, b) => b.tokens - a.tokens)
  if (items.length === 0) {
    return { items: fallback, precise: false }
  }

  return { items, precise: true }
}

function buildWindowAgentBreakdown(
  sessions: SessionUsage[],
  dateSet: Set<string> | null,
  fallback: AgentUsageAggregate[]
): { items: AgentUsageAggregate[]; precise: boolean } {
  if (!dateSet) {
    return { items: fallback, precise: true }
  }

  const agentMap = new Map<string, AgentUsageAggregate>()

  for (const session of sessions) {
    const agentId = session.agentId || parseAgentIdFromSessionKey(session.key)
    let tokens = 0
    let cost = 0

    for (const day of session.usage.dailyBreakdown || []) {
      if (!dateSet.has(day.date)) continue
      tokens += day.tokens
      cost += day.cost
    }

    if (tokens === 0 && cost === 0) {
      const fallbackDate = toDateKey(session.usage.lastActivity || session.updatedAt)
      if (fallbackDate && dateSet.has(fallbackDate)) {
        tokens = session.usage.totalTokens || 0
        cost = session.usage.totalCost || 0
      }
    }

    if (tokens === 0 && cost === 0) continue

    const existing = agentMap.get(agentId) || { agentId, tokens: 0, cost: 0, sessions: 0, lastActivity: 0 }
    agentMap.set(agentId, {
      agentId,
      tokens: existing.tokens + tokens,
      cost: existing.cost + cost,
      sessions: existing.sessions + 1,
      lastActivity: Math.max(existing.lastActivity || 0, session.usage.lastActivity || session.updatedAt || 0),
    })
  }

  const items = [...agentMap.values()].sort((a, b) => b.tokens - a.tokens)
  if (items.length === 0) {
    return { items: fallback, precise: false }
  }

  return { items, precise: true }
}

function SummaryMetric({
  label,
  value,
  delta,
  detail,
}: {
  label: string
  value: string
  delta?: string | null
  detail?: string
}) {
  return (
    <div className="rounded-xl border border-gray-800 dark:border-gray-800 light:border-slate-200 bg-gray-950/60 dark:bg-gray-950/60 light:bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-500 light:text-slate-500">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold text-white dark:text-white light:text-slate-900">{value}</p>
        {delta && <span className="pb-1 text-xs text-gray-400 dark:text-gray-400 light:text-slate-500">{delta}</span>}
      </div>
      {detail && <p className="mt-1 text-xs text-gray-600 dark:text-gray-600 light:text-slate-500">{detail}</p>}
    </div>
  )
}

function BreakdownRow({
  label,
  sublabel,
  value,
  percent,
  barColor,
}: {
  label: string
  sublabel: string
  value: string
  percent: number
  barColor: string
}) {
  return (
    <div className="rounded-lg border border-gray-800 dark:border-gray-800 light:border-slate-200 bg-gray-950/50 dark:bg-gray-950/50 light:bg-white/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white dark:text-white light:text-slate-900">{label}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">{sublabel}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-200 dark:text-gray-200 light:text-slate-700">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">{percent}%</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800 dark:bg-gray-800 light:bg-slate-200">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: barColor }} />
      </div>
    </div>
  )
}

export function UsageSummary({
  usage,
  lastUpdated,
  isRefetching = false,
  onManualRefresh,
  autoRefreshInterval = 30_000,
  errorMessage,
}: UsageSummaryProps) {
  const [range, setRange] = useState<RangeValue>(14)

  const view = useMemo(() => {
    const daily = usage.dailyAggregated || []
    const filteredDaily = range === 'all' ? daily : daily.slice(-range)
    const dateSet = range === 'all' ? null : new Set(filteredDaily.map(item => item.date))

    const totalTokens = filteredDaily.reduce((sum, item) => sum + item.tokens, 0)
    const totalCost = filteredDaily.reduce((sum, item) => sum + item.cost, 0)
    const chartData: ChartPoint[] = filteredDaily.map(item => ({
      date: formatDateShort(item.date),
      fullDate: item.date,
      tokens: item.tokens,
      cost: item.cost,
    }))

    const currentWindowSize = filteredDaily.length
    const previousWindow = range === 'all'
      ? []
      : daily.slice(Math.max(0, daily.length - currentWindowSize * 2), Math.max(0, daily.length - currentWindowSize))
    const previousTokens = previousWindow.reduce((sum, item) => sum + item.tokens, 0)
    const previousCost = previousWindow.reduce((sum, item) => sum + item.cost, 0)

    const modelView = buildWindowModelBreakdown(usage.sessions || [], dateSet, usage.modelBreakdown || [])
    const agentView = buildWindowAgentBreakdown(usage.sessions || [], dateSet, usage.agentBreakdown || [])

    return {
      chartData,
      totalTokens,
      totalCost,
      previousTokens,
      previousCost,
      modelBreakdown: modelView.items,
      agentBreakdown: agentView.items,
      modelPrecise: modelView.precise,
      agentPrecise: agentView.precise,
      rangeLabel: formatRangeLabel(range, filteredDaily.length),
    }
  }, [range, usage])

  const tokenDelta = calculatePercentChange(view.totalTokens, view.previousTokens)
  const costDelta = calculatePercentChange(view.totalCost, view.previousCost)
  const topModelShare = view.totalTokens > 0 && view.modelBreakdown[0]
    ? Math.round((view.modelBreakdown[0].tokens / view.totalTokens) * 100)
    : 0
  const topAgentShare = view.totalTokens > 0 && view.agentBreakdown[0]
    ? Math.round((view.agentBreakdown[0].tokens / view.totalTokens) * 100)
    : 0

  return (
    <div className="rounded-xl border border-gray-800 dark:border-gray-800 light:border-slate-200 bg-gray-900 dark:bg-gray-900 light:bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white dark:text-white light:text-slate-900">Token Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500 light:text-slate-500">
            {view.rangeLabel}内观察 token 趋势、模型分布和 agent 分布
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <RefreshStatus
            isRefetching={isRefetching}
            lastUpdated={lastUpdated || usage.updatedAt}
            onManualRefresh={onManualRefresh}
            autoRefreshInterval={autoRefreshInterval}
            degradedAfterMs={autoRefreshInterval * 3}
            isDegraded={Boolean(errorMessage)}
            degradedMessage={errorMessage}
            idleLabel="等待首次拉取"
          />

          <div className="flex flex-wrap gap-1">
            {DATE_RANGE_OPTIONS.map(option => (
              <button
                key={option.label}
                onClick={() => setRange(option.value)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  range === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-800 dark:bg-gray-800 light:bg-slate-100 text-gray-400 dark:text-gray-400 light:text-slate-600 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Tokens"
          value={formatTokens(view.totalTokens)}
          delta={range === 'all' || tokenDelta === null ? null : `${tokenDelta > 0 ? '+' : ''}${tokenDelta}%`}
          detail={range === 'all' ? '全量累计' : `对比前 ${range} 天`}
        />
        <SummaryMetric
          label="Cost"
          value={formatCost(view.totalCost)}
          delta={range === 'all' || costDelta === null ? null : `${costDelta > 0 ? '+' : ''}${costDelta}%`}
          detail={range === 'all' ? '全量累计成本' : '同窗口成本变化'}
        />
        <SummaryMetric
          label="Models"
          value={String(view.modelBreakdown.length)}
          detail={view.modelBreakdown[0] ? `Top model ${topModelShare}%` : '暂无模型明细'}
        />
        <SummaryMetric
          label="Agents"
          value={String(view.agentBreakdown.length)}
          detail={view.agentBreakdown[0] ? `Top agent ${topAgentShare}%` : '暂无 agent 明细'}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-gray-800 dark:border-gray-800 light:border-slate-200 bg-gray-950/50 dark:bg-gray-950/50 light:bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white dark:text-white light:text-slate-900">Trend Over Time</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">按天聚合 token 消耗</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-600 light:text-slate-500">{view.chartData.length} points</p>
          </div>

          {view.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={view.chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={value => formatTokens(Number(value))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.75rem',
                  }}
                  formatter={(value: number) => [`${formatTokens(value)} tokens`, 'Tokens']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#usageTrendFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#93c5fd' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-gray-600 dark:text-gray-600 light:text-slate-500">
              暂无 usage 趋势数据
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 dark:border-gray-800 light:border-slate-200 bg-gray-950/50 dark:bg-gray-950/50 light:bg-slate-50 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-white dark:text-white light:text-slate-900">By Model</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">
              {view.modelPrecise ? '使用当前窗口内模型明细' : '缺少窗口级明细，回退到总聚合'}
            </p>
          </div>
          <div className="space-y-2">
            {view.modelBreakdown.slice(0, 5).map(model => {
              const percent = view.totalTokens > 0 ? Math.max(1, Math.round((model.tokens / view.totalTokens) * 100)) : 0
              return (
                <BreakdownRow
                  key={`${model.provider}:${model.model}`}
                  label={formatModelName(model.model)}
                  sublabel={`${model.provider} · ${formatCost(model.cost)}`}
                  value={formatTokens(model.tokens)}
                  percent={percent}
                  barColor="#3b82f6"
                />
              )
            })}
            {view.modelBreakdown.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-600 light:text-slate-500">暂无模型维度数据</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 dark:border-gray-800 light:border-slate-200 bg-gray-950/50 dark:bg-gray-950/50 light:bg-slate-50 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-white dark:text-white light:text-slate-900">By Agent</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500">
              {view.agentPrecise ? '按 session 活动聚合到 agent' : '缺少窗口级明细，回退到总聚合'}
            </p>
          </div>
          <div className="space-y-2">
            {view.agentBreakdown.slice(0, 5).map(agent => {
              const percent = view.totalTokens > 0 ? Math.max(1, Math.round((agent.tokens / view.totalTokens) * 100)) : 0
              return (
                <BreakdownRow
                  key={agent.agentId}
                  label={agent.agentId}
                  sublabel={`${agent.sessions} sessions · ${formatCost(agent.cost)}`}
                  value={formatTokens(agent.tokens)}
                  percent={percent}
                  barColor={getAgentColor(agent.agentId)}
                />
              )
            })}
            {view.agentBreakdown.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-600 light:text-slate-500">暂无 agent 维度数据</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-600 light:text-slate-500 md:flex-row md:items-center md:justify-between">
        <span>数据范围: {usage.startDate || '-'} ~ {usage.endDate || '-'}</span>
        <span>Gateway updatedAt: {usage.updatedAt ? new Date(usage.updatedAt).toLocaleString('zh-CN') : '-'}</span>
      </div>
    </div>
  )
}
