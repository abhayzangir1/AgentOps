import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  const { action } = await request.json()

  try {
    if (action === 'create-schema') {
      // Create agents table
      await query(`
        CREATE TABLE IF NOT EXISTS agents (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
          tier VARCHAR(50) DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
          parent_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
          monthly_cost_usd DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create permissions table
      await query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          permission_type VARCHAR(100) NOT NULL,
          resource VARCHAR(255) NOT NULL,
          granted_by_user_id INTEGER,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(agent_id, permission_type, resource)
        )
      `)

      // Create approvals table
      await query(`
        CREATE TABLE IF NOT EXISTS approvals (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          request_type VARCHAR(100) NOT NULL,
          request_details JSONB NOT NULL DEFAULT '{}',
          requested_by_user_id INTEGER,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          assigned_to_user_id INTEGER,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMPTZ,
          notes TEXT
        )
      `)

      // Create audit_logs table
      await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          actor_user_id INTEGER,
          details JSONB NOT NULL DEFAULT '{}',
          ip_address INET,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_approvals_agent ON approvals(agent_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_agent ON audit_logs(agent_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`)

      return NextResponse.json({ success: true, message: 'Schema created successfully' })
    }

    if (action === 'seed-data') {
      // Insert root agents
      await query(`
        INSERT INTO agents (name, description, status, tier, monthly_cost_usd)
        VALUES 
          ('Acme Corp AI Squad', 'Enterprise AI agent management', 'active', 'enterprise', 5000),
          ('DataFlow Pipeline', 'Real-time data processing', 'active', 'pro', 2500),
          ('ContentGen Pro', 'Automated content generation', 'active', 'pro', 1500),
          ('Support Bot', 'Customer support automation', 'paused', 'basic', 500)
        ON CONFLICT DO NOTHING
      `)

      // Get the IDs of root agents
      const rootAgents = await query(`SELECT id, name FROM agents WHERE parent_agent_id IS NULL`)
      const dataFlowId = rootAgents.rows.find((a: { name: string }) => a.name === 'DataFlow Pipeline')?.id
      const contentGenId = rootAgents.rows.find((a: { name: string }) => a.name === 'ContentGen Pro')?.id
      const supportBotId = rootAgents.rows.find((a: { name: string }) => a.name === 'Support Bot')?.id

      if (dataFlowId) {
        await query(`
          INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd)
          VALUES 
            ('DataFlow - Ingestion', 'Data collection and normalization', 'active', 'pro', $1, 1000),
            ('DataFlow - Processing', 'ETL transformations', 'active', 'pro', $1, 1000),
            ('DataFlow - Analytics', 'Real-time analytics engine', 'active', 'pro', $1, 500)
          ON CONFLICT DO NOTHING
        `, [dataFlowId])
      }

      if (contentGenId) {
        await query(`
          INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd)
          VALUES 
            ('ContentGen - Blog Posts', 'Blog content automation', 'active', 'basic', $1, 500),
            ('ContentGen - Social', 'Social media content generation', 'active', 'basic', $1, 500)
          ON CONFLICT DO NOTHING
        `, [contentGenId])
      }

      if (supportBotId) {
        await query(`
          INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd)
          VALUES 
            ('Support - Tier 1', 'Initial customer inquiries', 'active', 'basic', $1, 250),
            ('Support - Tier 2', 'Escalated support issues', 'paused', 'basic', $1, 250)
          ON CONFLICT DO NOTHING
        `, [supportBotId])
      }

      // Insert sample approvals
      const agents = await query(`SELECT id FROM agents LIMIT 3`)
      if (agents.rows.length > 0) {
        await query(`
          INSERT INTO approvals (agent_id, request_type, request_details, status)
          VALUES 
            ($1, 'resource_upgrade', '{"current_tier": "pro", "requested_tier": "enterprise", "reason": "increased load"}', 'pending'),
            ($2, 'config_change', '{"parameter": "batch_size", "old_value": 100, "new_value": 500}', 'pending'),
            ($3, 'cost_increase', '{"monthly_budget": 1500, "requested_budget": 2000}', 'pending')
          ON CONFLICT DO NOTHING
        `, [agents.rows[0]?.id, agents.rows[1]?.id, agents.rows[2]?.id])
      }

      return NextResponse.json({ success: true, message: 'Seed data inserted successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    return NextResponse.json({ 
      tables: result.rows.map((r: { table_name: string }) => r.table_name),
      message: 'Database connection successful'
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Connection failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
