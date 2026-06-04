-- Seed data for AgentOps demo
-- Organizations and top-level agents
INSERT INTO agents (name, description, status, tier, monthly_cost_usd, created_by_user_id) VALUES
('Acme Corp AI Squad', 'Enterprise AI agent management', 'active', 'enterprise', 5000, 1),
('DataFlow Pipeline', 'Real-time data processing', 'active', 'pro', 2500, 1),
('ContentGen Pro', 'Automated content generation', 'active', 'pro', 1500, 1),
('Support Bot', 'Customer support automation', 'paused', 'basic', 500, 1)
ON CONFLICT DO NOTHING;

-- Sub-agents (hierarchy)
INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, created_by_user_id) VALUES
('DataFlow - Ingestion', 'Data collection and normalization', 'active', 'pro', 2, 1000, 1),
('DataFlow - Processing', 'ETL transformations', 'active', 'pro', 2, 1000, 1),
('DataFlow - Analytics', 'Real-time analytics engine', 'active', 'pro', 2, 500, 1),
('ContentGen - Blog Posts', 'Blog content automation', 'active', 'basic', 3, 500, 1),
('ContentGen - Social', 'Social media content generation', 'active', 'basic', 3, 500, 1),
('Support - Tier 1', 'Initial customer inquiries', 'active', 'basic', 4, 250, 1),
('Support - Tier 2', 'Escalated support issues', 'paused', 'basic', 4, 250, 1)
ON CONFLICT DO NOTHING;

-- Sample permissions
INSERT INTO permissions (user_id, agent_id, permission_level) VALUES
(1, 1, 'admin'),
(1, 2, 'admin'),
(1, 3, 'admin'),
(2, 2, 'edit'),
(2, 5, 'edit'),
(3, 3, 'view'),
(3, 6, 'view')
ON CONFLICT DO NOTHING;

-- Sample pending approvals
INSERT INTO approvals (agent_id, request_type, request_details, requested_by_user_id, status, assigned_to_user_id) VALUES
(1, 'resource_upgrade', '{"current_tier": "pro", "requested_tier": "enterprise", "reason": "increased load"}', 2, 'pending', 1),
(2, 'config_change', '{"parameter": "batch_size", "old_value": 100, "new_value": 500}', 2, 'pending', 1),
(3, 'cost_increase', '{"monthly_budget": 1500, "requested_budget": 2000}', 2, 'pending', 1)
ON CONFLICT DO NOTHING;

-- Sample audit logs
INSERT INTO audit_logs (agent_id, event_type, event_description, user_id, previous_state, new_state) VALUES
(1, 'agent_created', 'Agent registered in system', 1, NULL, '{"name": "Acme Corp AI Squad", "tier": "enterprise"}'),
(1, 'status_change', 'Agent status changed', 1, '{"status": "paused"}', '{"status": "active"}'),
(2, 'tier_upgrade', 'Agent tier upgraded', 1, '{"tier": "basic"}', '{"tier": "pro"}'),
(3, 'cost_update', 'Monthly cost recalculated', 1, '{"monthly_cost": 1200}', '{"monthly_cost": 1500"}')
ON CONFLICT DO NOTHING;
