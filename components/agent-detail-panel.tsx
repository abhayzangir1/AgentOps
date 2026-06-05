'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { X, Edit, Pause, Play, Trash2, Activity, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import { Agent, ActivityEvent } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AgentDetailPanelProps {
  agent: Agent | null
  onClose: () => void
  onEdit: (agent: Agent) => void
  onStatusChange: () => void
}

export function AgentDetailPanel({ agent, onClose, onEdit, onStatusChange }: AgentDetailPanelProps) {
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  
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
    } catch (error) {
      console.error('Failed to toggle status:', error)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const recentActivities = Array.isArray(activities) ? activities : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg bg-card border-l border-border shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <h2 className="text-lg font-semibold">{agent.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground">{agent.description || 'No description provided'}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign size={14} />
                <span className="text-xs">Monthly Cost</span>
              </div>
              <p className="text-xl font-bold">${Number(agent.monthly_cost_usd).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle size={14} />
                <span className="text-xs">Budget Limit</span>
              </div>
              <p className="text-xl font-bold">
                {(agent as any).budget_limit_usd ? `$${Number((agent as any).budget_limit_usd).toLocaleString()}` : 'No limit'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${agent.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Tier</span>
                <span className="font-medium capitalize">{agent.tier}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(agent.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{new Date(agent.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} />
              Recent Activity
            </h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.eventId} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      activity.status === 'success' ? 'bg-green-500' : 
                      activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold">Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={() => onEdit(agent)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={toggleStatus}
                disabled={isTogglingStatus}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                {agent.status === 'active' ? (
                  <>
                    <Pause size={14} />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
