'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import {
  ChevronDown,
  CircleDot,
  Pause,
  Play,
  Plus,
  Eye,
  AlertCircle,
  RefreshCw,
  LayoutList,
  Network,
} from 'lucide-react'
import { AgentFormDialog } from './agent-form-dialog'
import { AgentDetailPanel } from './agent-detail-panel'
import { OrgChart } from './org-chart'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
})

export function AgentRegistry() {
  const { data: agents, isLoading, error, mutate } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 5000,
  })

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [view, setView] = useState<'list' | 'org'>('list')

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }

  const toggleAgentStatus = async (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation()
    setTogglingId(agent.id)
    try {
      const newStatus = agent.status === 'active' ? 'paused' : 'active'
      await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      mutate()
    } catch (error) {
      console.error('Failed to toggle agent status:', error)
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    )
  }

  if (error || !agents) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Agents</h3>
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

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Plus size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first AI agent to get started
        </p>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm"
        >
          <Plus size={16} />
          Add Agent
        </button>
        <AgentFormDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => mutate()}
          parentAgents={[]}
          editAgent={null}
        />
      </div>
    )
  }

  const topLevelAgents = agents.filter((a) => !a.parent_agent_id)
  const childAgents = (parentId: number) => agents.filter((a) => a.parent_agent_id === parentId)

  const handleAgentClick = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAgent(agent)
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button and View Toggle */}
      <div className="flex items-center justify-between">
        {/* View switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-muted/30 rounded-lg border border-border">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList size={13} />
            List
          </button>
          <button
            onClick={() => setView('org')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'org' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network size={13} />
            Org Chart
          </button>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Add Agent
        </button>
      </div>

      {/* Agent List or Org Chart */}
      {view === 'list' ? (
      <div className="space-y-3">
      {topLevelAgents.map((agent) => {
        const children = childAgents(agent.id)
        const isExpanded = expandedIds.has(agent.id)

        return (
          <div key={agent.id} className="border border-border rounded-lg overflow-hidden">
            {/* Parent Agent */}
            <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <button
                onClick={() => toggleExpanded(agent.id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <CircleDot
                  size={16}
                  className={`flex-shrink-0 ${
                    agent.status === 'active' ? 'text-green-500 fill-green-500' : 'text-muted-foreground'
                  }`}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{agent.name}</h4>
                  <p className="text-xs text-muted-foreground">{agent.tier} • ${agent.monthly_cost_usd}/mo</p>
                </div>
                {children.length > 0 && (
                  <ChevronDown
                    size={16}
                    className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              <button
                onClick={(e) => handleAgentClick(agent, e)}
                className="p-2 rounded hover:bg-muted transition-colors ml-2"
                title="View details"
              >
                <Eye size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Child Agents */}
            {isExpanded && children.length > 0 && (
              <div className="border-t border-border bg-muted/30 divide-y divide-border">
                {children.map((child) => (
                  <div key={child.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <CircleDot
                        size={12}
                        className={`${
                          child.status === 'active' ? 'text-green-500 fill-green-500' : 'text-muted-foreground'
                        }`}
                      />
                      <div>
                        <p className="text-xs font-medium">{child.name}</p>
                        <p className="text-xs text-muted-foreground">${child.monthly_cost_usd}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleAgentClick(child, e)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View details"
                      >
                        <Eye size={14} className="text-muted-foreground" />
                      </button>
                      <button 
                        onClick={(e) => toggleAgentStatus(child, e)}
                        disabled={togglingId === child.id}
                        className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {child.status === 'active' ? (
                          <Pause size={14} className="text-muted-foreground" />
                        ) : (
                          <Play size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      </div>
      ) : (
        <OrgChart onAgentClick={(agent) => setSelectedAgent(agent)} />
      )}

      {/* Create/Edit Dialog */}
      <AgentFormDialog
        isOpen={showCreateDialog || !!editingAgent}
        onClose={() => {
          setShowCreateDialog(false)
          setEditingAgent(null)
        }}
        onSuccess={() => mutate()}
        parentAgents={topLevelAgents}
        editAgent={editingAgent}
      />

      {/* Detail Panel */}
      <AgentDetailPanel
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onEdit={(agent) => {
          setSelectedAgent(null)
          setEditingAgent(agent)
        }}
        onStatusChange={() => mutate()}
      />
    </div>
  )
}
