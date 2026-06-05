'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Agent } from '@/lib/types'
import { ChevronRight, Shield, Users, Lock, Eye, Edit, Crown } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Permission {
  agent_id: number
  agent_name: string
  permission_level: string
  inherited: boolean
  depth: number
}

const PERMISSION_LEVELS = {
  view: { label: 'View', icon: Eye, color: 'text-blue-500' },
  edit: { label: 'Edit', icon: Edit, color: 'text-yellow-500' },
  admin: { label: 'Admin', icon: Crown, color: 'text-accent' },
  approve: { label: 'Approve', icon: Shield, color: 'text-green-500' },
}

export function PermissionHierarchy() {
  const [selectedUserId, setSelectedUserId] = useState<number>(1)
  const { data: permissions, isLoading } = useSWR<Permission[]>(
    `/api/permissions?userId=${selectedUserId}`,
    fetcher,
    { refreshInterval: 10000 }
  )
  const { data: agents } = useSWR<Agent[]>('/api/agents', fetcher)

  const permissionList = Array.isArray(permissions) ? permissions : []
  const agentList = Array.isArray(agents) ? agents : []

  // Build hierarchy tree
  const buildTree = () => {
    const topLevel = agentList.filter((a) => !a.parent_agent_id)
    const getChildren = (parentId: number): Agent[] => 
      agentList.filter((a) => a.parent_agent_id === parentId)

    const getPermission = (agentId: number) => 
      permissionList.find((p) => p.agent_id === agentId)

    return { topLevel, getChildren, getPermission }
  }

  const { topLevel, getChildren, getPermission } = buildTree()

  const renderAgentNode = (agent: Agent, depth: number = 0) => {
    const children = getChildren(agent.id)
    const permission = getPermission(agent.id)
    const PermIcon = permission ? PERMISSION_LEVELS[permission.permission_level as keyof typeof PERMISSION_LEVELS]?.icon || Shield : Lock

    return (
      <div key={agent.id} className="space-y-1">
        <div 
          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors ${
            permission ? 'bg-muted/30' : ''
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {children.length > 0 && (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
          {children.length === 0 && <div className="w-3.5" />}
          
          <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          
          <span className="text-sm flex-1">{agent.name}</span>
          
          {permission ? (
            <div className={`flex items-center gap-1 text-xs ${PERMISSION_LEVELS[permission.permission_level as keyof typeof PERMISSION_LEVELS]?.color || 'text-muted-foreground'}`}>
              <PermIcon size={12} />
              <span>{PERMISSION_LEVELS[permission.permission_level as keyof typeof PERMISSION_LEVELS]?.label || permission.permission_level}</span>
              {permission.inherited && (
                <span className="text-muted-foreground">(inherited)</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock size={12} />
              <span>No access</span>
            </div>
          )}
        </div>
        {children.map((child) => renderAgentNode(child, depth + 1))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* User Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Users size={16} className="text-muted-foreground" />
          <span>Viewing permissions for:</span>
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
          className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value={1}>Admin User (ID: 1)</option>
          <option value={2}>Manager User (ID: 2)</option>
          <option value={3}>Viewer User (ID: 3)</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg border border-border">
        {Object.entries(PERMISSION_LEVELS).map(([key, { label, icon: Icon, color }]) => (
          <div key={key} className={`flex items-center gap-1 text-xs ${color}`}>
            <Icon size={12} />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock size={12} />
          <span>No access</span>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield size={16} className="text-accent" />
          Agent Permission Hierarchy
        </h3>
        <div className="space-y-1">
          {topLevel.map((agent) => renderAgentNode(agent))}
          {topLevel.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No agents found</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-muted/30 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-accent">{permissionList.length}</p>
          <p className="text-xs text-muted-foreground">Total Permissions</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-green-500">
            {permissionList.filter((p) => !p.inherited).length}
          </p>
          <p className="text-xs text-muted-foreground">Direct</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold text-yellow-500">
            {permissionList.filter((p) => p.inherited).length}
          </p>
          <p className="text-xs text-muted-foreground">Inherited</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg border border-border text-center">
          <p className="text-2xl font-bold">
            {permissionList.filter((p) => p.permission_level === 'admin').length}
          </p>
          <p className="text-xs text-muted-foreground">Admin Access</p>
        </div>
      </div>
    </div>
  )
}
