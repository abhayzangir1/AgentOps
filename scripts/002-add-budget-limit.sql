-- Migration: Add budget_limit_usd column to agents table
-- This enables per-agent budget limit tracking for enterprise cost management

ALTER TABLE agents ADD COLUMN IF NOT EXISTS budget_limit_usd DECIMAL(10,2) DEFAULT NULL;

-- Add index for budget queries
CREATE INDEX IF NOT EXISTS idx_agents_budget ON agents(budget_limit_usd) WHERE budget_limit_usd IS NOT NULL;

-- Add capability_scopes column for enterprise permission management  
ALTER TABLE agents ADD COLUMN IF NOT EXISTS capability_scopes TEXT[] DEFAULT '{}';

-- Add escalation_policy column for approval workflows
ALTER TABLE agents ADD COLUMN IF NOT EXISTS escalation_policy JSONB DEFAULT '{"timeout_hours": 24, "escalate_to": null}';

-- Comment for documentation
COMMENT ON COLUMN agents.budget_limit_usd IS 'Maximum monthly budget allowed for this agent in USD';
COMMENT ON COLUMN agents.capability_scopes IS 'Array of permission scopes this agent can operate within';
COMMENT ON COLUMN agents.escalation_policy IS 'JSON policy for approval escalation behavior';
