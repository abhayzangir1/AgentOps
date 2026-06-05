'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { ChevronDown, CircleDot, Pause, Play } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Demo data for hackathon
const DEMO_AGENTS: Agent[] = [
  {
    id: 1,
    name: 'Acme Corp AI Squad',
    description: 'Enterprise AI agent management',
    status: 'active',
    tier: 'enterprise',
    parent_agent_id: null,
    monthly_cost_usd: 5000,
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-04T19:20:00Z',
  },
  {
    id: 2,
    name: 'DataFlow Pipeline',
    description: 'Real-time data processing',
    status: 'active',
    tier: 'pro',
    parent_agent_id: null,
    monthly_cost_usd: 2500,
    created_at: '2025-06-01T11:00:00Z',
    updated_at: '2025-06-04T19:15:00Z',
  },
  {
    id: 3,
    name: 'ContentGen Pro',
    description: 'Automated content generation',
    status: 'active',
    tier: 'pro',
    parent_agent_id: null,
    monthly_cost_usd: 1500,
    created_at: '2025-06-02T09:00:00Z',
    updated_at: '2025-06-04T19:10:00Z',
  },
  {
    id: 4,
    name: 'Support Bot',
    description: 'Customer support automation',
    status: 'paused',
    tier: 'basic',
    parent_agent_id: null,
    monthly_cost_usd: 500,
    created_at: '2025-06-02T14:00:00Z',
    updated_at: '2025-06-04T18:30:00Z',
  },
  // Child agents
  {
    id: 5,
    name: 'DataFlow - Ingestion',
    description: 'Data collection and normalization',
    status: 'active',
    tier: 'pro',
    parent_agent_id: 2,
    monthly_cost_usd: 1000,
    created_at: '2025-06-01T12:00:00Z',
    updated_at: '2025-06-04T19:15:00Z',
  },
  {
    id: 6,
    name: 'DataFlow - Processing',
    description: 'ETL transformations',
    status: 'active',
    tier: 'pro',
    parent_agent_id: 2,
    monthly_cost_usd: 1000,
    created_at: '2025-06-01T12:30:00Z',
    updated_at: '2025-06-04T19:15:00Z',
  },
  {
    id: 7,
    name: 'DataFlow - Analytics',
    description: 'Real-time analytics engine',
    status: 'active',
    tier: 'pro',
    parent_agent_id: 2,
    monthly_cost_usd: 500,
    created_at: '2025-06-01T13:00:00Z',
    updated_at: '2025-06-04T19:15:00Z',
  },
  {
    id: 8,
    name: 'ContentGen - Blog Posts',
    description: 'Blog content automation',
    status: 'active',
    tier: 'basic',
    parent_agent_id: 3,
    monthly_cost_usd: 500,
    created_at: '2025-06-02T10:00:00Z',
    updated_at: '2025-06-04T19:10:00Z',
  },
  {
    id: 9,
    name: 'ContentGen - Social',
    description: 'Social media content generation',
    status: 'active',
    tier: 'basic',
    parent_agent_id: 3,
    monthly_cost_usd: 500,
    created_at: '2025-06-02T10:30:00Z',
    updated_at: '2025-06-04T19:10:00Z',
  },
  {
    id: 10,
    name: 'Support - Tier 1',
    description: 'Initial customer inquiries',
    status: 'active',
    tier: 'basic',
    parent_agent_id: 4,
    monthly_cost_usd: 250,
    created_at: '2025-06-02T15:00:00Z',
    updated_at: '2025-06-04T18:30:00Z',
  },
  {
    id: 11,
    name: 'Support - Tier 2',
    description: 'Escalated support issues',
    status: 'paused',
    tier: 'basic',
    parent_agent_id: 4,
    monthly_cost_usd: 250,
    created_at: '2025-06-02T15:30:00Z',
    updated_at: '2025-06-04T18:30:00Z',
  },
]

export function AgentRegistry() {
  const { data: rawAgents, isLoading, mutate } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 5000,
  })

  // Use demo data if API returns error or non-array response
  const agents = Array.isArray(rawAgents) ? rawAgents : DEMO_AGENTS

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [togglingId, setTogglingId] = useState<number | null>(null)

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

  const topLevelAgents = agents?.filter((a) => !a.parent_agent_id) || []
  const childAgents = (parentId: number) => agents?.filter((a) => a.parent_agent_id === parentId) || []

  return (
    <div className="space-y-3">
      {topLevelAgents.map((agent) => {
        const children = childAgents(agent.id)
        const isExpanded = expandedIds.has(agent.id)

        return (
          <div key={agent.id} className="border border-border rounded-lg overflow-hidden">
            {/* Parent Agent */}
            <button
              onClick={() => toggleExpanded(agent.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
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
              </div>
              {children.length > 0 && (
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              )}
            </button>

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
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
