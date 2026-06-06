'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import {
  ChevronRight,
  ChevronDown,
  Shield,
  Users,
  Lock,
  Eye,
  Edit2,
  Crown,
  AlertTriangle,
  DollarSign,
  GitBranch,
  ShieldCheck,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Permission {
  agent_id: number
  agent_name: string
  permission_level: string
  inherited: boolean
  depth: number
}

const PERMISSION_LEVELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; rank: number }
> = {
  view:    { label: 'View',    icon: Eye,        color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    rank: 1 },
  edit:    { label: 'Edit',    icon: Edit2,      color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20', rank: 2 },
  approve: { label: 'Approve', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', rank: 3 },
  admin:   { label: 'Admin',   icon: Crown,      color: 'text-accent',      bg: 'bg-accent/10 border-accent/20',         rank: 4 },
}

// Check if a child's permission would exceed parent — core governance rule
function isPermissionExceedsParent(
  childLevel: string,
  parentLevel: string | undefined,
): boolean {
  if (!parentLevel) return false
  const childRank = PERMISSION_LEVELS[childLevel]?.rank ?? 0
  const parentRank = PERMISSION_LEVELS[parentLevel]?.rank ?? 4
  return childRank > parentRank
}

interface AgentNodeProps {
  agent: Agent
  agents: Agent[]
  permissions: Permission[]
  depth: number
  parentPermission?: string
  budgetByAgent: Map<number, { cost: number; limit: number | null }>
}

function AgentNode({
  agent,
  agents,
  permissions,
  depth,
  parentPermission,
  budgetByAgent,
}: AgentNodeProps) {
  const [open, setOpen] = useState(depth === 0)
  const children = agents.filter((a) => a.parent_agent_id === agent.id)
  const permission = permissions.find((p) => p.agent_id === agent.id)
  const permConfig = permission
    ? PERMISSION_LEVELS[permission.permission_level]
    : null
  const PermIcon = permConfig?.icon ?? Lock

  const budget = budgetByAgent.get(agent.id)
  const budgetPct = budget?.limit ? (budget.cost / budget.limit) * 100 : 0
  const overBudget = budget?.limit ? budget.cost > budget.limit : false

  // Governance violation: child has more permission than parent
  const isViolation =
    permission && parentPermission
      ? isPermissionExceedsParent(permission.permission_level, parentPermission)
      : false

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isViolation
            ? 'bg-red-500/10 border border-red-500/20'
            : 'hover:bg-muted/30'
        }`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        {/* Expand toggle */}
        {children.length > 0 ? (
          <button
            onClick={() => setOpen(!open)}
            className="p-0.5 rounded hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            {open ? (
              <ChevronDown size={13} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={13} className="text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            agent.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'
          }`}
        />

        {/* Name */}
        <span className="text-sm flex-1 truncate">{agent.name}</span>

        {/* Scope / tier badge */}
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase flex-shrink-0">
          {agent.tier}
        </span>

        {/* Budget indicator */}
        {budget?.limit && (
          <div
            className={`flex items-center gap-1 text-xs flex-shrink-0 ${
              overBudget ? 'text-red-400' : budgetPct >= 80 ? 'text-yellow-400' : 'text-muted-foreground'
            }`}
            title={`$${budget.cost} / $${budget.limit}`}
          >
            <DollarSign size={11} />
            <span>{budgetPct.toFixed(0)}%</span>
          </div>
        )}

        {/* Violation badge */}
        {isViolation && (
          <div
            title="Permission exceeds parent — governance violation"
            className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded flex-shrink-0"
          >
            <AlertTriangle size={11} />
            Violation
          </div>
        )}

        {/* Permission badge */}
        {permConfig ? (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${permConfig.bg} ${permConfig.color} flex-shrink-0`}
          >
            <PermIcon size={11} />
            <span>{permConfig.label}</span>
            {permission?.inherited && (
              <span className="text-muted-foreground ml-0.5">(inherited)</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full flex-shrink-0">
            <Lock size={11} />
            <span>No access</span>
          </div>
        )}
      </div>

      {/* Children */}
      {open &&
        children.map((child) => (
          <AgentNode
            key={child.id}
            agent={child}
            agents={agents}
            permissions={permissions}
            depth={depth + 1}
            parentPermission={permission?.permission_level}
            budgetByAgent={budgetByAgent}
          />
        ))}
    </div>
  )
}

export function PermissionHierarchy() {
  const [selectedUserId, setSelectedUserId] = useState<number>(1)

  const { data: rawPermissions, isLoading: permLoading } = useSWR<Permission[]>(
    `/api/permissions?userId=${selectedUserId}`,
    fetcher,
    { refreshInterval: 10000 },
  )
  const { data: rawAgents, isLoading: agentsLoading } = useSWR<Agent[]>('/api/agents', fetcher)

  const permissions = Array.isArray(rawPermissions) ? rawPermissions : []
  const agents = Array.isArray(rawAgents) ? rawAgents : []

  const topLevel = agents.filter((a) => !a.parent_agent_id)

  // Budget map for each agent
  const budgetByAgent = new Map<number, { cost: number; limit: number | null }>()
  for (const a of agents) {
    budgetByAgent.set(a.id, {
      cost: Number(a.monthly_cost_usd) || 0,
      limit: a.budget_limit_usd ? Number(a.budget_limit_usd) : null,
    })
  }

  // Count violations
  const violations = permissions.filter((p) => {
    const agent = agents.find((a) => a.id === p.agent_id)
    if (!agent?.parent_agent_id) return false
    const parentPerm = permissions.find((pp) => pp.agent_id === agent.parent_agent_id)
    return isPermissionExceedsParent(p.permission_level, parentPerm?.permission_level)
  })

  const isLoading = permLoading || agentsLoading

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Users size={15} className="text-muted-foreground" />
          <span className="text-muted-foreground">Viewing as:</span>
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
          className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value={1}>Admin (User #1)</option>
          <option value={2}>Manager (User #2)</option>
          <option value={3}>Viewer (User #3)</option>
        </select>
      </div>

      {/* Governance violation alert */}
      {violations.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">
              {violations.length} governance violation{violations.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-red-300/80">
            Sub-agents with permission levels exceeding their parent&apos;s scope violate the
            hierarchical boundary rule. Review and correct these assignments.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-lg border border-border">
        {Object.entries(PERMISSION_LEVELS).map(([, { label, icon: Icon, color, bg }]) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${bg} ${color}`}
          >
            <Icon size={11} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-2 py-1 rounded-full">
          <Lock size={11} />
          No access
        </div>
        <div className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/25 bg-red-500/10 px-2 py-1 rounded-full ml-auto">
          <AlertTriangle size={11} />
          Violation
        </div>
      </div>

      {/* Tree */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={15} className="text-accent" />
          <h3 className="text-sm font-semibold">Agent Permission Hierarchy</h3>
          <span className="ml-auto text-xs text-muted-foreground">{permissions.length} permissions resolved via recursive CTE</span>
        </div>
        <div className="space-y-0.5">
          {topLevel.length > 0 ? (
            topLevel.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                agents={agents}
                permissions={permissions}
                depth={0}
                budgetByAgent={budgetByAgent}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No agents found</p>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Permissions', value: permissions.length, color: 'text-accent' },
          {
            label: 'Direct',
            value: permissions.filter((p) => !p.inherited).length,
            color: 'text-emerald-400',
          },
          {
            label: 'Inherited',
            value: permissions.filter((p) => p.inherited).length,
            color: 'text-blue-400',
          },
          { label: 'Violations', value: violations.length, color: violations.length > 0 ? 'text-red-400' : 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 bg-muted/20 rounded-lg border border-border text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
