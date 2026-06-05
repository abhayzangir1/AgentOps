'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { TrendingUp, DollarSign, Activity, Pause, Download, AlertTriangle, Edit2, RefreshCw } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
})

export function CostDashboard() {
  const [mounted, setMounted] = useState(false)
  const { data: agents, isLoading, error, mutate } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 10000,
  })
  const [editingBudget, setEditingBudget] = useState<number | null>(null)
  const [budgetValue, setBudgetValue] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return <div className="h-96 bg-muted rounded-lg animate-pulse" />
  }

  if (error || !agents) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle size={48} className="text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Cost Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Could not connect to Aurora PostgreSQL database
        </p>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    )
  }

  const totalCost = agents.reduce((sum, a) => sum + (Number(a.monthly_cost_usd) || 0), 0) || 1
  const activeCost = agents.filter((a) => a.status === 'active').reduce((sum, a) => sum + (Number(a.monthly_cost_usd) || 0), 0)
  const pausedCost = totalCost - activeCost

  // Budget alerts
  const budgetAlerts = agents.filter((a) => {
    if (!a.budget_limit_usd) return false
    const cost = Number(a.monthly_cost_usd) || 0
    const limit = Number(a.budget_limit_usd)
    return cost >= limit * 0.8 // 80% or more of budget
  })

  // Group by tier
  const costByTier = agents.reduce((acc, agent) => {
    const tier = agent.tier || 'unknown'
    const cost = Number(agent.monthly_cost_usd) || 0
    acc[tier] = (acc[tier] || 0) + cost
    return acc
  }, {} as Record<string, number>)

  const tierColors: Record<string, string> = {
    enterprise: 'bg-accent',
    pro: 'bg-blue-500',
    basic: 'bg-green-500',
    unknown: 'bg-gray-500',
  }

  const exportToCSV = () => {
    const headers = ['Agent ID', 'Name', 'Status', 'Tier', 'Monthly Cost', 'Budget Limit', 'Budget Usage %']
    const rows = agents.map((a) => {
      const cost = Number(a.monthly_cost_usd) || 0
      const limit = a.budget_limit_usd ? Number(a.budget_limit_usd) : null
      const usage = limit ? ((cost / limit) * 100).toFixed(1) : 'N/A'
      return [a.id, a.name, a.status, a.tier, cost, limit || 'No limit', usage]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cost-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const saveBudgetLimit = async (agentId: number) => {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          budget_limit_usd: budgetValue ? parseFloat(budgetValue) : null 
        }),
      })
      mutate()
      setEditingBudget(null)
      setBudgetValue('')
    } catch (error) {
      console.error('Failed to update budget:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <AlertTriangle size={16} />
            <span className="font-semibold text-sm">Budget Alerts</span>
          </div>
          <div className="space-y-1">
            {budgetAlerts.map((agent) => {
              const cost = Number(agent.monthly_cost_usd) || 0
              const limit = Number(agent.budget_limit_usd)
              const percent = ((cost / limit) * 100).toFixed(0)
              return (
                <p key={agent.id} className="text-sm text-yellow-700">
                  {agent.name}: ${cost.toLocaleString()} / ${limit.toLocaleString()} ({percent}% used)
                </p>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign size={16} />
            <span className="text-xs">Total Monthly</span>
          </div>
          <p className="text-2xl font-bold text-accent">${totalCost.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity size={16} />
            <span className="text-xs">Active Agents</span>
          </div>
          <p className="text-2xl font-bold text-green-500">${activeCost.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Pause size={16} />
            <span className="text-xs">Paused Agents</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">${pausedCost.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertTriangle size={16} />
            <span className="text-xs">Budget Alerts</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{budgetAlerts.length}</p>
        </div>
      </div>

      {/* Cost by Tier */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <h3 className="text-sm font-semibold mb-4">Cost by Agent Tier</h3>
        <div className="space-y-3">
          {Object.entries(costByTier)
            .sort(([, a], [, b]) => b - a)
            .map(([tier, cost]) => (
              <div key={tier} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{tier}</span>
                  <span className="text-muted-foreground">${cost.toLocaleString()}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tierColors[tier] || 'bg-accent'} transition-all`}
                    style={{ width: `${(cost / totalCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Agent Budget Management */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            <h3 className="text-sm font-semibold">Agent Budget Management</h3>
          </div>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {agents
            .sort((a, b) => (Number(b.monthly_cost_usd) || 0) - (Number(a.monthly_cost_usd) || 0))
            .map((agent) => {
              const cost = Number(agent.monthly_cost_usd) || 0
              const limit = agent.budget_limit_usd ? Number(agent.budget_limit_usd) : null
              const usagePercent = limit ? (cost / limit) * 100 : 0
              const isOverBudget = limit && cost > limit
              const isNearBudget = limit && cost >= limit * 0.8

              return (
                <div key={agent.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm font-medium truncate">{agent.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cost: ${cost.toLocaleString()}
                      {limit && (
                        <span className={isOverBudget ? 'text-red-500' : isNearBudget ? 'text-yellow-500' : ''}>
                          {' '}/ ${limit.toLocaleString()} ({usagePercent.toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {editingBudget === agent.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={budgetValue}
                        onChange={(e) => setBudgetValue(e.target.value)}
                        placeholder="Limit"
                        className="w-24 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <button
                        onClick={() => saveBudgetLimit(agent.id)}
                        className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingBudget(null); setBudgetValue('') }}
                        className="px-2 py-1 text-xs border border-border rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingBudget(agent.id)
                        setBudgetValue(limit?.toString() || '')
                      }}
                      className="p-2 rounded hover:bg-muted transition-colors"
                      title="Set budget limit"
                    >
                      <Edit2 size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Cost by Status */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <h3 className="text-sm font-semibold mb-4">Cost Distribution by Status</h3>
        <div className="flex items-center gap-8">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                className="text-green-500"
                strokeDasharray={`${(activeCost / totalCost) * 251.2} 251.2`}
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                className="text-yellow-500"
                strokeDasharray={`${(pausedCost / totalCost) * 251.2} 251.2`}
                strokeDashoffset={`-${(activeCost / totalCost) * 251.2}`}
              />
            </svg>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-sm">Active: ${activeCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-sm">Paused: ${pausedCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
