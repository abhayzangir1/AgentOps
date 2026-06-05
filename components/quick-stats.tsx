'use client'

import useSWR from 'swr'
import { Agent } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Approval {
  id: number
  status: string
}

export function QuickStats() {
  const { data: rawAgents } = useSWR<Agent[]>('/api/agents', fetcher, { refreshInterval: 5000 })
  const { data: rawApprovals } = useSWR<Approval[]>('/api/approvals', fetcher, { refreshInterval: 5000 })

  const agents = Array.isArray(rawAgents) ? rawAgents : []
  const approvals = Array.isArray(rawApprovals) ? rawApprovals : []

  const totalAgents = agents.length
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length
  const monthlyBudget = agents.reduce((sum, a) => sum + (Number(a.monthly_cost_usd) || 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Total Agents</p>
        <p className="text-3xl font-bold text-accent">{totalAgents}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Pending Approvals</p>
        <p className="text-3xl font-bold text-yellow-500">{pendingApprovals}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Monthly Budget</p>
        <p className="text-3xl font-bold text-green-500">
          ${monthlyBudget.toLocaleString()}
        </p>
      </div>
    </div>
  )
}
