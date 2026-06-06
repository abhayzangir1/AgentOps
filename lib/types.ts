export interface Agent {
  id: number
  name: string
  description: string
  status: 'active' | 'paused' | 'inactive'
  tier: 'basic' | 'pro' | 'enterprise'
  parent_agent_id: number | null
  monthly_cost_usd: number
  budget_limit_usd: number | null
  capability_scopes: string[]
  escalation_policy: {
    timeout_hours: number
    escalate_to: number | null
    notify_on_escalation?: boolean
  } | null
  created_at: string
  updated_at: string
}

export interface CostSnapshot {
  date: string
  totalCost: number
  agentBreakdown: Record<string, number>
}

export interface ActivityEvent {
  eventId: string
  agentId: number
  eventType: 'execution' | 'error' | 'approval' | 'deployment'
  description: string
  costUSD?: number
  duration?: number
  status: 'success' | 'pending' | 'failed'
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface Approval {
  id: number
  agent_id: number
  request_type: 'deploy' | 'resource_upgrade' | 'config_change' | 'cost_increase' | 'budget_increase'
  request_details: Record<string, unknown>
  requested_by_user_id: number
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  assigned_to_user_id: number | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  notes: string | null
}

export interface AuditLog {
  id: number
  agent_id: number | null
  event_type: string
  event_description: string
  user_id: number
  previous_state: Record<string, any> | null
  new_state: Record<string, any> | null
  created_at: string
}

export interface Permission {
  id: number
  user_id: number
  agent_id: number
  permission_level: 'view' | 'edit' | 'admin' | 'approve'
}

export interface CurrentUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
}
