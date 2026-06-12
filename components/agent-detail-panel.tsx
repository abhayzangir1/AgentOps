'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  X,
  Edit,
  Pause,
  Play,
  Activity,
  DollarSign,
  AlertTriangle,
  Shield,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Hash,
} from 'lucide-react'
import { Agent } from '@/lib/types'
import { ActivityEvent } from '@/lib/dynamodb'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AgentDetailPanelProps {
  agent: Agent | null
  onClose: () => void
  onEdit: (agent: Agent) => void
  onStatusChange: () => void
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  active:   { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Active' },
  paused:   { dot: 'bg-yellow-400',  text: 'text-yellow-400',  label: 'Paused' },
  inactive: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'Inactive' },
}

const TIER_STYLES: Record<string, string> = {
  enterprise: 'bg-accent text-accent-foreground',
  pro:        'bg-blue-500 text-white',
  basic:      'bg-emerald-600 text-white',
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function AgentDetailPanel({ agent, onClose, onEdit, onStatusChange }: AgentDetailPanelProps) {
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [showAllScopes, setShowAllScopes] = useState(false)
  
  const { data: activities } = useSWR<ActivityEvent[]>(
    agent ? `/api/activity?agentId=${agent.id}&limit=10` : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  if (!agent) return null

  const toggleStatus = async () => {
    setIsTogglingStatus(true)
    try {
      const newStatus = agent.status === 'active' ? 'paused' : 'active'
      await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onStatusChange()
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const recentActivities = Array.isArray(activities) ? activities : []
  const statusStyle = STATUS_STYLES[agent.status] ?? STATUS_STYLES.inactive
  const scopes = agent.capability_scopes ?? []
  const displayedScopes = showAllScopes ? scopes : scopes.slice(0, 6)

  const cost = Number(agent.monthly_cost_usd) || 0
  const limit = agent.budget_limit_usd ? Number(agent.budget_limit_usd) : null
  const budgetPct = limit ? Math.min((cost / limit) * 100, 100) : 0
  const isOverBudget = limit ? cost >= limit : false
  const isNearBudget = limit ? cost >= limit * 0.8 : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg bg-card border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
            <h2 className="text-base font-semibold truncate">{agent.name}</h2>
            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${TIER_STYLES[agent.tier] ?? 'bg-muted text-muted-foreground'}`}>
              {agent.tier}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Description */}
          {agent.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
          )}

          {/* Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border">
            <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
            <span className={`text-sm font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
            {agent.parent_agent_id && (
              <>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">Sub-agent #{agent.parent_agent_id}</span>
              </>
            )}
            <span className="ml-auto text-xs text-muted-foreground font-mono">#{agent.id}</span>
          </div>

          {/* Cost + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign size={13} />
                <span className="text-xs">Monthly Cost</span>
              </div>
              <p className="text-xl font-bold text-accent">${cost.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-lg border ${isOverBudget ? 'border-red-500/30 bg-red-500/5' : isNearBudget ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-muted/20'}`}>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <AlertTriangle size={13} />
                <span className="text-xs">Budget Cap</span>
              </div>
              <p className={`text-xl font-bold ${isOverBudget ? 'text-red-400' : isNearBudget ? 'text-yellow-400' : 'text-foreground'}`}>
                {limit ? `$${limit.toLocaleString()}` : 'No cap'}
              </p>
            </div>
          </div>

          {/* Budget progress bar */}
          {limit && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Budget utilization</span>
                <span className={isOverBudget ? 'text-red-400 font-semibold' : isNearBudget ? 'text-yellow-400 font-semibold' : ''}>
                  {budgetPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-yellow-500' : 'bg-accent'}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Capability Scopes */}
          {scopes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={13} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold">Capability Scopes</h3>
                <span className="ml-auto text-xs text-muted-foreground">{scopes.length} granted</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {displayedScopes.map((scope) => (
                  <span
                    key={scope}
                    className="text-[11px] px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-medium"
                  >
                    {scope}
                  </span>
                ))}
                {scopes.length > 6 && (
                  <button
                    onClick={() => setShowAllScopes(!showAllScopes)}
                    className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                  >
                    {showAllScopes ? (
                      <><ChevronUp size={10} /> Show less</>
                    ) : (
                      <><ChevronDown size={10} /> +{scopes.length - 6} more</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Escalation Policy */}
          {agent.escalation_policy && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={13} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold">Escalation Policy</h3>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeout</span>
                  <span className="font-medium">{agent.escalation_policy.timeout_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escalate to</span>
                  <span className="font-medium">
                    {agent.escalation_policy.escalate_to
                      ? `User #${agent.escalation_policy.escalate_to}`
                      : 'Default manager'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="space-y-1 text-sm border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">Details</h3>
            {[
              { label: 'Agent ID', value: `#${agent.id}`, icon: Hash },
              { label: 'Created', value: new Date(agent.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), icon: Tag },
              { label: 'Last Updated', value: new Date(agent.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Icon size={12} />
                  {label}
                </span>
                <span className="font-medium text-xs">{value}</span>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Activity size={13} />
              Recent Activity
            </h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-2">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.eventId}
                    className="flex items-start gap-2.5 p-2.5 bg-muted/20 rounded-lg text-sm border border-border/50"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      activity.status === 'success' ? 'bg-emerald-500' :
                      activity.status === 'failed'  ? 'bg-red-500'     : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{formatRelativeTime(activity.timestamp)}</span>
                        {activity.costUSD != null && activity.costUSD > 0 && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-accent">${activity.costUSD.toFixed(4)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                      activity.status === 'success' ? 'bg-emerald-500/15 text-emerald-400' :
                      activity.status === 'failed'  ? 'bg-red-500/15 text-red-400'         :
                      'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                No recent activity recorded
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onEdit(agent)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Edit size={14} />
              Edit Agent
            </button>
            <button
              onClick={toggleStatus}
              disabled={isTogglingStatus}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                agent.status === 'active'
                  ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {agent.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
              {isTogglingStatus ? 'Updating...' : agent.status === 'active' ? 'Pause' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
