'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { TrendingUp, DollarSign, Activity, Pause } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DEMO_AGENTS: Agent[] = [
  { id: 1, name: 'Acme Corp AI Squad', description: '', status: 'active', tier: 'enterprise', parent_agent_id: null, monthly_cost_usd: 5000, created_at: '', updated_at: '' },
  { id: 2, name: 'DataFlow Pipeline', description: '', status: 'active', tier: 'pro', parent_agent_id: null, monthly_cost_usd: 2500, created_at: '', updated_at: '' },
  { id: 3, name: 'ContentGen Pro', description: '', status: 'active', tier: 'pro', parent_agent_id: null, monthly_cost_usd: 1500, created_at: '', updated_at: '' },
  { id: 4, name: 'Support Bot', description: '', status: 'paused', tier: 'basic', parent_agent_id: null, monthly_cost_usd: 500, created_at: '', updated_at: '' },
]

export function CostDashboard() {
  const [mounted, setMounted] = useState(false)
  const { data: rawAgents, isLoading, error } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 10000,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const agents = Array.isArray(rawAgents) ? rawAgents : DEMO_AGENTS

  if (!mounted || isLoading) {
    return <div className="h-96 bg-muted rounded-lg animate-pulse" />
  }

  const totalCost = agents.reduce((sum, a) => sum + (Number(a.monthly_cost_usd) || 0), 0) || 1
  const activeCost = agents.filter((a) => a.status === 'active').reduce((sum, a) => sum + (Number(a.monthly_cost_usd) || 0), 0)
  const pausedCost = totalCost - activeCost

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

  return (
    <div className="space-y-6">
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
            <TrendingUp size={16} />
            <span className="text-xs">Agent Count</span>
          </div>
          <p className="text-2xl font-bold">{agents.length}</p>
        </div>
      </div>

      {/* Cost by Tier - Simple Bar Chart */}
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

      {/* Agent Cost Breakdown */}
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-accent" />
          <h3 className="text-sm font-semibold">Agent Cost Breakdown</h3>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {agents
            .sort((a, b) => (Number(b.monthly_cost_usd) || 0) - (Number(a.monthly_cost_usd) || 0))
            .map((agent) => {
              const cost = Number(agent.monthly_cost_usd) || 0
              return (
                <div key={agent.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="truncate">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">${cost.toLocaleString()}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${(cost / totalCost) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Cost by Status - Simple Pie representation */}
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
