'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import {
  DollarSign,
  TrendingUp,
  Pause,
  Play,
  Download,
  AlertTriangle,
  Edit2,
  RefreshCw,
  ShieldOff,
  BarChart3,
  Zap,
  X,
} from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch')
    return r.json()
  })

const TIER_CAPS: Record<string, number> = {
  enterprise: 10000,
  pro: 3000,
  basic: 1000,
}

const TIER_COLOR: Record<string, string> = {
  enterprise: 'bg-accent',
  pro: 'bg-blue-500',
  basic: 'bg-emerald-500',
}

function BudgetBar({
  cost,
  limit,
  paused,
}: {
  cost: number
  limit: number | null
  paused: boolean
}) {
  const cap = limit ?? 0
  if (cap === 0) return <div className="h-1.5 bg-muted rounded-full" />
  const pct = Math.min((cost / cap) * 100, 100)
  const isOver = pct >= 100
  const isNear = pct >= 80

  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          paused ? 'bg-muted-foreground' : isOver ? 'bg-red-500' : isNear ? 'bg-yellow-500' : 'bg-accent'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function AgentCostRow({
  agent,
  onPause,
  onEditBudget,
}: {
  agent: Agent
  onPause: (agent: Agent) => void
  onEditBudget: (agent: Agent) => void
}) {
  const cost = Number(agent.monthly_cost_usd) || 0
  const limit = agent.budget_limit_usd ? Number(agent.budget_limit_usd) : null
  const tierCap = TIER_CAPS[agent.tier] ?? 1000
  const pct = limit ? Math.min((cost / limit) * 100, 100) : 0
  const isOver = limit ? cost >= limit : false
  const isNear = limit ? cost >= limit * 0.8 : false
  const isRunaway = cost > tierCap * 0.9

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        isOver
          ? 'border-red-500/30 bg-red-500/5'
          : isRunaway
          ? 'border-orange-500/30 bg-orange-500/5'
          : 'border-border hover:bg-muted/20'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            agent.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'
          }`}
        />

        {/* Name + tier */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{agent.name}</span>
            {(isOver || isRunaway) && (
              <ShieldOff size={12} className={isOver ? 'text-red-400' : 'text-orange-400'} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                TIER_COLOR[agent.tier] ?? 'bg-muted'
              } text-black`}
            >
              {agent.tier}
            </span>
            <span className="text-xs text-muted-foreground">
              ${cost.toLocaleString()}
              {limit ? ` / $${limit.toLocaleString()}` : ' / no cap'}
            </span>
            {limit && (
              <span
                className={`text-xs font-semibold ${
                  isOver ? 'text-red-400' : isNear ? 'text-yellow-400' : 'text-muted-foreground'
                }`}
              >
                ({pct.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEditBudget(agent)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Set budget cap"
          >
            <Edit2 size={13} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => onPause(agent)}
            className={`p-1.5 rounded transition-colors ${
              isOver
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'hover:bg-muted text-muted-foreground'
            }`}
            title={agent.status === 'active' ? 'Pause agent' : 'Resume agent'}
          >
            {agent.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
          </button>
        </div>
      </div>

      {/* Budget bar */}
      <div className="mt-2">
        <BudgetBar cost={cost} limit={limit} paused={agent.status !== 'active'} />
      </div>
    </div>
  )
}

export function CostDashboard() {
  const {
    data: agents,
    isLoading,
    error,
    mutate,
  } = useSWR<Agent[]>('/api/agents', fetcher, { refreshInterval: 10000 })

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [budgetValue, setBudgetValue] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  if (isLoading) {
    return <div className="h-96 bg-muted/40 rounded-xl animate-pulse" />
  }

  if (error || !agents) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <AlertTriangle size={28} className="text-destructive" />
        <div>
          <p className="text-sm font-medium">Failed to load cost data</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cannot reach Aurora PostgreSQL</p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded text-xs font-medium"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    )
  }

  const totalCost = agents.reduce((s, a) => s + (Number(a.monthly_cost_usd) || 0), 0)
  const activeCost = agents
    .filter((a) => a.status === 'active')
    .reduce((s, a) => s + (Number(a.monthly_cost_usd) || 0), 0)
  const pausedCost = totalCost - activeCost

  const budgetAlerts = agents.filter((a) => {
    if (!a.budget_limit_usd) return false
    return Number(a.monthly_cost_usd) >= Number(a.budget_limit_usd) * 0.8
  })

  const runawayAgents = agents.filter((a) => {
    const tierCap = TIER_CAPS[a.tier] ?? 1000
    return Number(a.monthly_cost_usd) > tierCap * 0.9 && a.status === 'active'
  })

  const costByTier = agents.reduce(
    (acc, a) => {
      acc[a.tier] = (acc[a.tier] || 0) + (Number(a.monthly_cost_usd) || 0)
      return acc
    },
    {} as Record<string, number>,
  )

  const handlePause = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active'
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    mutate()
  }

  const handleSaveBudget = async () => {
    if (!editingAgent) return
    setSavingBudget(true)
    try {
      await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_limit_usd: budgetValue ? parseFloat(budgetValue) : null,
        }),
      })
      mutate()
      setEditingAgent(null)
      setBudgetValue('')
    } finally {
      setSavingBudget(false)
    }
  }

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Status', 'Tier', 'Monthly Cost', 'Budget Limit', 'Usage %']
    const rows = agents.map((a) => {
      const cost = Number(a.monthly_cost_usd) || 0
      const limit = a.budget_limit_usd ? Number(a.budget_limit_usd) : null
      return [
        a.id,
        a.name,
        a.status,
        a.tier,
        cost,
        limit ?? 'No cap',
        limit ? `${((cost / limit) * 100).toFixed(1)}%` : 'N/A',
      ]
    })
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cost-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Budget edit modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Set Budget Cap</h3>
              <button
                onClick={() => { setEditingAgent(null); setBudgetValue('') }}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{editingAgent.name}</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Monthly budget cap (USD) — leave empty to remove
              </label>
              <input
                type="number"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                placeholder={`Tier max: $${TIER_CAPS[editingAgent.tier]?.toLocaleString()}`}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Current spend: ${(Number(editingAgent.monthly_cost_usd) || 0).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveBudget}
                disabled={savingBudget}
                className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {savingBudget ? 'Saving...' : 'Save Cap'}
              </button>
              <button
                onClick={() => { setEditingAgent(null); setBudgetValue('') }}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 size={16} />
          <span>{agents.length} agents tracked</span>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Runaway alert */}
      {runawayAgents.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ShieldOff size={16} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">
              {runawayAgents.length} runaway agent{runawayAgents.length > 1 ? 's' : ''} detected
            </span>
          </div>
          <p className="text-xs text-red-300/80 mb-3">
            These agents are approaching their tier spending cap. Consider pausing or setting a hard budget limit.
          </p>
          <div className="flex flex-wrap gap-2">
            {runawayAgents.map((a) => (
              <button
                key={a.id}
                onClick={() => handlePause(a)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors"
              >
                <Pause size={11} />
                Pause {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">Budget alerts ({budgetAlerts.length})</span>
          </div>
          <div className="space-y-1">
            {budgetAlerts.map((a) => {
              const cost = Number(a.monthly_cost_usd) || 0
              const limit = Number(a.budget_limit_usd)
              const pct = ((cost / limit) * 100).toFixed(0)
              return (
                <p key={a.id} className="text-xs text-yellow-300/80">
                  {a.name}: ${cost.toLocaleString()} / ${limit.toLocaleString()} —{' '}
                  <strong>{pct}%</strong> of cap used
                </p>
              )
            })}
          </div>
        </div>
      )}

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Monthly', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-accent' },
          { label: 'Active Spend', value: `$${activeCost.toLocaleString()}`, icon: Zap, color: 'text-emerald-400' },
          { label: 'Paused Spend', value: `$${pausedCost.toLocaleString()}`, icon: Pause, color: 'text-yellow-400' },
          { label: 'Budget Alerts', value: String(budgetAlerts.length), icon: AlertTriangle, color: 'text-orange-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Icon size={14} />
              <span className="text-xs">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Cost by tier */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Spend by tier</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(costByTier)
            .sort(([, a], [, b]) => b - a)
            .map(([tier, cost]) => {
              const cap = TIER_CAPS[tier] ?? 1000
              const total = agents.filter((a) => a.tier === tier).length
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          TIER_COLOR[tier] ?? 'bg-muted'
                        } text-black`}
                      >
                        {tier}
                      </span>
                      <span className="text-xs text-muted-foreground">{total} agents</span>
                    </div>
                    <span className="text-sm font-medium">${cost.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${TIER_COLOR[tier] ?? 'bg-accent'}`}
                      style={{ width: `${Math.min((cost / totalCost) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Per-agent management */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={15} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Per-agent budget enforcement</h3>
          <span className="text-xs text-muted-foreground ml-auto">Click edit to set cap · pause to freeze spend</span>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {[...agents]
            .sort((a, b) => (Number(b.monthly_cost_usd) || 0) - (Number(a.monthly_cost_usd) || 0))
            .map((agent) => (
              <AgentCostRow
                key={agent.id}
                agent={agent}
                onPause={handlePause}
                onEditBudget={(a) => {
                  setEditingAgent(a)
                  setBudgetValue(a.budget_limit_usd ? String(a.budget_limit_usd) : '')
                }}
              />
            ))}
        </div>
      </div>
    </div>
  )
}
