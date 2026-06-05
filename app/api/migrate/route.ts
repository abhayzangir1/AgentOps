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
