'use client'

import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const COLORS = ['#00d4ff', '#0099cc', '#006699', '#003366', '#001a33']

export function CostDashboard() {
  const { data: agents, isLoading } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 10000,
  })

  if (isLoading) {
    return <div className="h-96 bg-muted rounded-lg animate-pulse" />
  }

  const totalCost = agents?.reduce((sum, a) => sum + a.monthly_cost_usd, 0) || 0
  const activeCost = agents?.filter((a) => a.status === 'active').reduce((sum, a) => sum + a.monthly_cost_usd, 0) || 0

  const costByTier = agents?.reduce(
    (acc, agent) => {
      const existing = acc.find((item) => item.tier === agent.tier)
      if (existing) {
        existing.cost += agent.monthly_cost_usd
      } else {
        acc.push({ tier: agent.tier, cost: agent.monthly_cost_usd })
      }
      return acc
    },
    [] as { tier: string; cost: number }[],
  ) || []

  const costByStatus = agents?.reduce(
    (acc, agent) => {
      const existing = acc.find((item) => item.status === agent.status)
      if (existing) {
        existing.cost += agent.monthly_cost_usd
      } else {
        acc.push({ status: agent.status, cost: agent.monthly_cost_usd })
      }
      return acc
    },
    [] as { status: string; cost: number }[],
  ) || []

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Total Monthly Cost</p>
          <p className="text-2xl font-bold text-accent">${totalCost.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Active Agents Cost</p>
          <p className="text-2xl font-bold text-green-500">${activeCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost by Tier */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <h3 className="text-sm font-semibold mb-4">Cost by Agent Tier</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costByTier}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="tier" stroke="#888888" style={{ fontSize: '12px' }} />
              <YAxis stroke="#888888" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Bar dataKey="cost" fill="#00d4ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Status */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <h3 className="text-sm font-semibold mb-4">Cost by Agent Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={costByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, cost }) => `${status}: $${cost.toFixed(0)}`}
                outerRadius={80}
                fill="#00d4ff"
                dataKey="cost"
              >
                {costByStatus.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ffffff' }}
              />
            </PieChart>
          </ResponsiveContainer>
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
            ?.sort((a, b) => b.monthly_cost_usd - a.monthly_cost_usd)
            .map((agent) => (
              <div key={agent.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50">
                <span className="truncate flex-1">{agent.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">${agent.monthly_cost_usd.toFixed(2)}</span>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(agent.monthly_cost_usd / totalCost) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
