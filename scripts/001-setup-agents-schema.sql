-- Agents table: Core agent registry with hierarchy
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'inactive')),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'pro', 'enterprise')),
  parent_agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  monthly_cost_usd DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INT NOT NULL DEFAULT 1
);

-- Permissions table: RBAC for agent access
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('view', 'edit', 'admin', 'approve')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, agent_id)
);

-- Approvals table: Human-in-the-loop request workflow
CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('deploy', 'resource_upgrade', 'config_change', 'cost_increase')),
  request_details JSONB NOT NULL,
  requested_by_user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  assigned_to_user_id INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- Audit log table: Immutable event history
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  event_description TEXT NOT NULL,
  user_id INT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_agent ON permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_approvals_agent ON approvals(agent_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
