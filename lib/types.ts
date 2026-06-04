export interface Agent {
  id: number
  name: string
  description: string
  status: 'active' | 'paused' | 'inactive'
  tier: 'basic' | 'pro' | 'enterprise'
  parent_agent_id: number | null
  monthly_cost_usd: number
  created_at: string
  updated_at: string
}

export interface Approval {
  id: number
  agent_id: number
  request_type: 'deploy' | 'resource_upgrade' | 'config_change' | 'cost_increase'
  request_details: Record<string, any>
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
