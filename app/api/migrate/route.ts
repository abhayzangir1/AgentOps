import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST() {
  try {
    // Add budget_limit_usd column
    await query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS budget_limit_usd DECIMAL(10,2) DEFAULT NULL
    `)

    // Add capability_scopes column
    await query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS capability_scopes TEXT[] DEFAULT '{}'
    `)

    // Add escalation_policy column
    await query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS escalation_policy JSONB DEFAULT '{"timeout_hours": 24, "escalate_to": null}'
    `)

    // Create indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_agents_budget ON agents(budget_limit_usd) WHERE budget_limit_usd IS NOT NULL
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)
    `)

    // Add unique constraint on name for upsert support
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name_unique ON agents(name)
    `)

    // Fix permissions table schema for recursive CTE
    await query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'permissions' AND column_name = 'permission_type'
        ) THEN
          DROP TABLE IF EXISTS permissions CASCADE;
        END IF;
      END $$;
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        permission_level VARCHAR(50) NOT NULL CHECK (permission_level IN ('view', 'edit', 'admin', 'approve')),
        granted_by_user_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, agent_id)
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id)
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_agent ON permissions(agent_id)
    `)

    // Seed initial permissions for demo user (user_id = 1)
    const agents = await query(`SELECT id FROM agents`)
    for (const agent of agents.rows) {
      await query(`
        INSERT INTO permissions (user_id, agent_id, permission_level)
        VALUES (1, $1, 'admin')
        ON CONFLICT (user_id, agent_id) DO NOTHING
      `, [agent.id])
    }

    // Set default budget limits based on tier
    await query(`
      UPDATE agents SET budget_limit_usd = 
        CASE 
          WHEN tier = 'enterprise' THEN 5000
          WHEN tier = 'pro' THEN 1000
          ELSE 500
        END
      WHERE budget_limit_usd IS NULL
    `)

    // Billing: persist plan + subscription on users (starter is the free default)
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'starter'
    `)
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(64) DEFAULT NULL
    `)

    // API keys for SDK/programmatic access (only a SHA-256 hash is stored)
    await query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        key_prefix VARCHAR(16) NOT NULL,
        key_hash CHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMPTZ DEFAULT NULL,
        revoked_at TIMESTAMPTZ DEFAULT NULL
      )
    `).catch(() => {})
    
    // If table already exists, ensure agent_id column is present
    await query(`
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE
    `).catch(() => {})
    
    await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)`)

    // Gateway requests: track /guard pre-action checks and approval decisions
    // Agents poll this to learn if their action was approved/denied/still-pending
    await query(`
      CREATE TABLE IF NOT EXISTS gateway_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_type VARCHAR(100) NOT NULL,
        request_details JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
        decision_reason TEXT DEFAULT NULL,
        decided_by_user_id INTEGER REFERENCES users(id),
        requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        decided_at TIMESTAMPTZ DEFAULT NULL,
        expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
      )
    `)
    await query(`CREATE INDEX IF NOT EXISTS idx_gateway_requests_agent ON gateway_requests(agent_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_gateway_requests_status ON gateway_requests(status)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_gateway_requests_user ON gateway_requests(user_id)`)

    // Webhook alerting configs (Slack / Microsoft Teams / generic JSON)
    await query(`
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL CHECK (provider IN ('slack', 'teams', 'generic')),
        url TEXT NOT NULL,
        events TEXT[] NOT NULL DEFAULT '{approval.pending,approval.decided,budget.alert}',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_fired_at TIMESTAMPTZ DEFAULT NULL,
        last_status INTEGER DEFAULT NULL
      )
    `)
    await query(`CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_configs(user_id)`)

    // The demo ops account manages a 14-agent fleet — mark it as a Growth
    // customer so the starter 3-agent limit reflects reality.
    await query(`
      UPDATE users SET plan = 'growth' WHERE email = 'ops@company.ai' AND plan = 'starter'
    `)

    // Ensure budget_used_usd column exists (for tracking spend)
    await query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS budget_used_usd DECIMAL(10,2) DEFAULT 0
    `).catch(() => {})

    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      changes: [
        'Added budget_limit_usd column',
        'Added capability_scopes column',
        'Added escalation_policy column',
        'Created performance indexes',
        'Set default budget limits by tier',
        'Fixed permissions table for recursive CTE',
        'Seeded admin permissions for all agents'
      ]
    })
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: String(error) }, { status: 500 })
  }
}
