'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { Agent } from '@/lib/types'
import { TrendingUp, Target, Calendar, DollarSign } from 'lucide-react'

interface CostForecastChartProps {
  agents: Agent[]
}

// Generate realistic 30-day cost trend data derived from current spend
function generateCostHistory(agents: Agent[]) {
  const totalCurrent = agents.reduce((s, a) => s + (Number(a.monthly_cost_usd) || 0), 0)
  const totalBudget = agents.reduce((s, a) => s + (a.budget_limit_usd ? Number(a.budget_limit_usd) : 0), 0)
  const days = 30

  const data: Array<{ day: string; actual: number; forecast: number; budget: number }> = []

  const now = new Date()
  const dailyRate = totalCurrent / days

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    // Simulate organic growth + variance
    const progress = (days - i) / days
    const variance = (Math.random() - 0.5) * dailyRate * 0.3
    const cumulative = dailyRate * (days - i) + variance * (days - i) * 0.1

    // Past 20 days are "actual", next 10 are forecast
    const isPast = i > 9
    data.push({
      day: dayLabel,
      actual: isPast ? Math.max(0, cumulative) : 0,
      forecast: !isPast ? Math.max(0, cumulative + dailyRate * 2) : 0,
      budget: totalBudget > 0 ? totalBudget : totalCurrent * 1.25,
    })
  }

  return { data, projectedEOM: dailyRate * days * 1.05, totalBudget: totalBudget > 0 ? totalBudget : totalCurrent * 1.25 }
}

// Generate per-agent cost bar data
function generateAgentBreakdown(agents: Agent[]) {
  return [...agents]
    .sort((a, b) => (Number(b.monthly_cost_usd) || 0) - (Number(a.monthly_cost_usd) || 0))
    .slice(0, 8)
    .map((a) => ({
      name: a.name.length > 16 ? a.name.slice(0, 14) + '…' : a.name,
      cost: Number(a.monthly_cost_usd) || 0,
      budget: a.budget_limit_usd ? Number(a.budget_limit_usd) : null,
      tier: a.tier,
    }))
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>
            ${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  )
}

function BarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const cost = payload.find((p) => p.name === 'cost')?.value ?? 0
  const budget = payload.find((p) => p.name === 'budget')?.value
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold text-foreground mb-1.5 truncate max-w-36">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Spend</span>
        <span className="font-mono font-semibold text-accent">${cost.toLocaleString()}</span>
      </div>
      {budget && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Budget</span>
          <span className="font-mono font-semibold text-muted-foreground">${Number(budget).toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

export function CostForecastChart({ agents }: CostForecastChartProps) {
  const { data, projectedEOM, totalBudget } = useMemo(() => generateCostHistory(agents), [agents])
  const agentBreakdown = useMemo(() => generateAgentBreakdown(agents), [agents])

  const totalCurrent = agents.reduce((s, a) => s + (Number(a.monthly_cost_usd) || 0), 0)
  const budgetUtilization = totalBudget > 0 ? (totalCurrent / totalBudget) * 100 : 0
  const projectedOverrun = projectedEOM > totalBudget && totalBudget > 0

  return (
    <div className="space-y-5">
      {/* Forecast summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Current MTD',
            value: `$${totalCurrent.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-accent',
            sub: `${budgetUtilization.toFixed(0)}% of budget`,
          },
          {
            label: 'Projected EOM',
            value: `$${Math.round(projectedEOM).toLocaleString()}`,
            icon: TrendingUp,
            color: projectedOverrun ? 'text-red-400' : 'text-emerald-400',
            sub: projectedOverrun ? 'Over budget!' : 'Within budget',
          },
          {
            label: 'Total Budget',
            value: totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : 'No cap set',
            icon: Target,
            color: 'text-foreground',
            sub: `${agents.filter((a) => a.budget_limit_usd).length} agents capped`,
          },
          {
            label: 'Daily Run Rate',
            value: `$${Math.round(totalCurrent / 30).toLocaleString()}/day`,
            icon: Calendar,
            color: 'text-blue-400',
            sub: 'Rolling 30-day avg',
          },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
              <Icon size={13} />
              <span className="text-xs">{label}</span>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* 30-day trend + forecast */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">30-Day Spend Trend + Forecast</h3>
          {projectedOverrun && (
            <span className="ml-auto text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
              Budget overrun projected
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#888', fontSize: 10 }}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: '#888', fontSize: 10 }}
              tickLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={totalBudget}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: 'Budget cap', fill: '#ef4444', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#00d4ff"
              strokeWidth={2}
              fill="url(#actualGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#00d4ff' }}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#forecastGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#60a5fa' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-2 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-accent inline-block" />
            Actual
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 border-t-2 border-dashed border-blue-400 inline-block" />
            Forecast
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 border-t-2 border-dashed border-red-500 inline-block" />
            Budget cap
          </div>
        </div>
      </div>

      {/* Per-agent cost breakdown bar chart */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Per-Agent Spend vs Budget</h3>
          <span className="ml-auto text-xs text-muted-foreground">Top {Math.min(agentBreakdown.length, 8)} by spend</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={agentBreakdown} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#888', fontSize: 9 }}
              tickLine={false}
              angle={-25}
              textAnchor="end"
              height={45}
            />
            <YAxis
              tick={{ fill: '#888', fontSize: 10 }}
              tickLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="cost" name="cost" fill="#00d4ff" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="budget" name="budget" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-2 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-accent inline-block" />
            Current spend
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white/10 inline-block" />
            Budget cap
          </div>
        </div>
      </div>
    </div>
  )
}
