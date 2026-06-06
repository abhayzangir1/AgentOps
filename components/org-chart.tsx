'use client'

import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { AlertCircle, RefreshCw, Bot, Network } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_DOT: Record<string, string> = {
  active:   'bg-emerald-500',
  paused:   'bg-yellow-400',
  inactive: 'bg-muted-foreground',
}

const TIER_BADGE: Record<string, string> = {
  enterprise: 'bg-accent/20 text-accent border-accent/30',
  pro:        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  basic:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

interface AgentCardProps {
  agent: Agent
  isRoot?: boolean
  onClick?: (agent: Agent) => void
}

function AgentCard({ agent, isRoot, onClick }: AgentCardProps) {
  const cost = Number(agent.monthly_cost_usd) || 0
  const limit = agent.budget_limit_usd ? Number(agent.budget_limit_usd) : null
  const budgetPct = limit ? Math.min((cost / limit) * 100, 100) : null
  const isOverBudget = limit ? cost >= limit : false
  const isNearBudget = limit ? cost >= limit * 0.8 : false

  return (
    <button
      onClick={() => onClick?.(agent)}
      className={`group flex flex-col gap-2 p-3 rounded-xl border transition-all text-left w-44 flex-shrink-0 ${
        isRoot
          ? 'border-accent/30 bg-accent/5 hover:bg-accent/10'
          : isOverBudget
          ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
          : 'border-border bg-card hover:bg-muted/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[agent.status] ?? 'bg-muted'}`} />
          <span className="text-xs font-semibold truncate">{agent.name}</span>
        </div>
        {isRoot && <Bot size={11} className="text-accent flex-shrink-0 mt-0.5" />}
      </div>

      {/* Tier badge */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${TIER_BADGE[agent.tier] ?? 'bg-muted text-muted-foreground border-border'}`}>
          {agent.tier}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">${cost.toLocaleString()}/mo</span>
      </div>

      {/* Budget bar */}
      {budgetPct !== null && (
        <div className="space-y-0.5">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-yellow-400' : 'bg-accent'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <p className={`text-[10px] ${isOverBudget ? 'text-red-400' : isNearBudget ? 'text-yellow-400' : 'text-muted-foreground'}`}>
            {budgetPct.toFixed(0)}% of ${limit?.toLocaleString()}
          </p>
        </div>
      )}
    </button>
  )
}

// Connector line between parent and children
function HorizontalConnector({ childCount }: { childCount: number }) {
  if (childCount === 0) return null
  return (
    <div className="flex items-start justify-center w-full my-0">
      <div className="w-px h-6 bg-border" />
    </div>
  )
}

interface AgentSubtreeProps {
  agent: Agent
  allAgents: Agent[]
  onAgentClick?: (agent: Agent) => void
  depth: number
}

function AgentSubtree({ agent, allAgents, onAgentClick, depth }: AgentSubtreeProps) {
  const children = allAgents.filter((a) => a.parent_agent_id === agent.id)

  return (
    <div className="flex flex-col items-center">
      {/* The agent card */}
      <AgentCard
        agent={agent}
        isRoot={depth === 0}
        onClick={onAgentClick}
      />

      {/* Connector down to children */}
      {children.length > 0 && (
        <>
          <div className="w-px h-5 bg-border flex-shrink-0" />

          {/* If more than 1 child, draw the horizontal bar */}
          {children.length > 1 && (
            <div
              className="h-px bg-border"
              style={{ width: `${children.length * 192 - 40}px`, maxWidth: '100%' }}
            />
          )}

          {/* Children row */}
          <div className="flex items-start gap-6 mt-0">
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-5 bg-border flex-shrink-0" />
                <AgentSubtree
                  agent={child}
                  allAgents={allAgents}
                  onAgentClick={onAgentClick}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface OrgChartProps {
  onAgentClick?: (agent: Agent) => void
}

export function OrgChart({ onAgentClick }: OrgChartProps) {
  const { data: rawAgents, isLoading, error, mutate } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 15000,
  })

  const agents = Array.isArray(rawAgents) ? rawAgents : []
  const topLevel = agents.filter((a) => !a.parent_agent_id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Loading org chart...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle size={28} className="text-destructive" />
        <p className="text-sm font-medium">Failed to load agents</p>
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

  if (topLevel.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-xl">
        <Network size={28} className="text-muted-foreground" />
        <p className="text-sm font-medium">No agents to visualize</p>
        <p className="text-xs text-muted-foreground">Create your first agent in the registry above</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-12 items-start justify-center min-w-max p-4">
        {topLevel.map((rootAgent) => (
          <AgentSubtree
            key={rootAgent.id}
            agent={rootAgent}
            allAgents={agents}
            onAgentClick={onAgentClick}
            depth={0}
          />
        ))}
      </div>
    </div>
  )
}
