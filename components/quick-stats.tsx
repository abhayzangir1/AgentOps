'use client'

import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { Bot, ShieldCheck, DollarSign, AlertTriangle, Zap, Pause } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Approval { id: number; status: string }

export function QuickStats() {
  const { data: rawAgents } = useSWR<Agent[]>('/api/agents', fetcher, { refreshInterval: 5000 })
  const { data: rawApprovals } = useSWR<Approval[]>('/api/approvals', fetcher, { refreshInterval: 5000 })

  const agents = Array.isArray(rawAgents) ? rawAgents : []
  const approvals = Array.isArray(rawApprovals) ? rawApprovals : []

  const totalAgents   = agents.length
  const activeAgents  = agents.filter((a) => a.status === 'active').length
  const pausedAgents  = agents.filter((a) => a.status === 'paused').length
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length
  const monthlyBudget = agents.reduce((s, a) => s + (Number(a.monthly_cost_usd) || 0), 0)
  const budgetAlerts  = agents.filter((a) => {
    if (!a.budget_limit_usd) return false
    return Number(a.monthly_cost_usd) >= Number(a.budget_limit_usd) * 0.8
  }).length

  const stats = [
    {
      label: 'Total Agents',
      value: String(totalAgents),
      sub: `${activeAgents} active · ${pausedAgents} paused`,
      icon: Bot,
      color: 'text-accent',
    },
    {
      label: 'Pending Approvals',
      value: String(pendingApprovals),
      sub: pendingApprovals > 0 ? 'Actions frozen' : 'All clear',
      icon: ShieldCheck,
      color: pendingApprovals > 0 ? 'text-yellow-400' : 'text-emerald-400',
    },
    {
      label: 'Monthly Spend',
      value: `$${monthlyBudget.toLocaleString()}`,
      sub: 'Across all agents',
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'Budget Alerts',
      value: String(budgetAlerts),
      sub: budgetAlerts > 0 ? 'Near or over cap' : 'All within cap',
      icon: AlertTriangle,
      color: budgetAlerts > 0 ? 'text-orange-400' : 'text-muted-foreground',
    },
  ]

  return (
    <div className="space-y-3">
      {stats.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border">
          <div className={`p-2 rounded-lg bg-muted/40 ${color}`}>
            <Icon size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
