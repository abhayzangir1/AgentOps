import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Idempotent DDL: creates all tables + adds any missing columns on existing tables
async function ensureSchema() {
  // users
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)

  // agents — create base table first
  await query(`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive', 'disabled')),
      tier VARCHAR(50) DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
      parent_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
      monthly_cost_usd DECIMAL(10,2) DEFAULT 0,
      budget_limit_usd DECIMAL(10,2) DEFAULT NULL,
      budget_used_usd DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add missing columns to agents if they don't exist yet
  const addColumnIfMissing = async (table: string, column: string, definition: string) => {
    const res = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      [table, column],
    )
    if (res.rows.length === 0) {
      await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    }
  }

  await addColumnIfMissing('agents', 'capability_scopes', `TEXT[] DEFAULT '{}'`)
  await addColumnIfMissing('agents', 'escalation_policy', `JSONB DEFAULT '{"timeout_hours":24,"escalate_to":null}'`)
  await addColumnIfMissing('agents', 'owner_user_id', `INTEGER REFERENCES users(id) ON DELETE SET NULL`)
  await addColumnIfMissing('agents', 'budget_used_usd', `DECIMAL(10,2) DEFAULT 0`)

  await query(`CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`)

  // permissions
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

  // approvals
  await query(`
    CREATE TABLE IF NOT EXISTS approvals (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      request_type VARCHAR(100) NOT NULL,
      request_details JSONB NOT NULL DEFAULT '{}',
      requested_by_user_id INTEGER,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
      assigned_to_user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMPTZ,
      notes TEXT
    )
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_approvals_agent ON approvals(agent_id)`)

  // audit_logs
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
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_agent ON audit_logs(agent_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`)
}

async function seedData() {
  // Root agents with full schema
  const result = await query(`SELECT COUNT(*) as cnt FROM agents WHERE parent_agent_id IS NULL`)
  if (parseInt(result.rows[0].cnt) > 0) return // already seeded

  await query(`
    INSERT INTO agents (name, description, status, tier, monthly_cost_usd, budget_limit_usd, capability_scopes, escalation_policy)
    VALUES
      ('Acme Corp AI Squad',  'Enterprise AI agent orchestrator',            'active',  'enterprise', 5000, 10000, ARRAY['read','write','deploy','approve','email','database'], '{"timeout_hours":4,"escalate_to":null}'),
      ('DataFlow Pipeline',   'Real-time data ingestion and transformation', 'active',  'pro',        2500,  3000, ARRAY['read','write','database'],                            '{"timeout_hours":12,"escalate_to":null}'),
      ('ContentGen Pro',      'Automated content generation pipeline',       'active',  'pro',        1500,  2000, ARRAY['read','write','email'],                               '{"timeout_hours":24,"escalate_to":null}'),
      ('Customer Support Bot','Tier-1 customer support automation',          'active',  'basic',       800,  1000, ARRAY['read','email'],                                       '{"timeout_hours":1,"escalate_to":null}')
  `)

  const roots = await query(`SELECT id, name FROM agents WHERE parent_agent_id IS NULL ORDER BY id`)
  const acmeId      = roots.rows.find((a: {name:string}) => a.name.includes('Acme'))?.id
  const dataFlowId  = roots.rows.find((a: {name:string}) => a.name.includes('DataFlow'))?.id
  const contentId   = roots.rows.find((a: {name:string}) => a.name.includes('ContentGen'))?.id
  const supportId   = roots.rows.find((a: {name:string}) => a.name.includes('Support'))?.id

  if (dataFlowId) {
    await query(`
      INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, capability_scopes, escalation_policy)
      VALUES
        ('DataFlow - Ingestion',   'Data collection and normalization',  'active', 'pro',   $1, 1000, 1200, ARRAY['read','database'],        '{"timeout_hours":12,"escalate_to":null}'),
        ('DataFlow - Processing',  'ETL transformations',                'active', 'pro',   $1, 1000, 1200, ARRAY['read','write','database'], '{"timeout_hours":12,"escalate_to":null}'),
        ('DataFlow - Analytics',   'Real-time analytics engine',         'active', 'pro',   $1,  500,  800, ARRAY['read'],                   '{"timeout_hours":24,"escalate_to":null}')
    `, [dataFlowId])
  }

  if (contentId) {
    await query(`
      INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, capability_scopes, escalation_policy)
      VALUES
        ('ContentGen - Blog Posts', 'Blog content automation',           'active',  'basic', $1, 500, 600, ARRAY['read','write','email'], '{"timeout_hours":24,"escalate_to":null}'),
        ('ContentGen - Social',     'Social media content generation',   'active',  'basic', $1, 500, 600, ARRAY['read','write','email'], '{"timeout_hours":24,"escalate_to":null}')
    `, [contentId])
  }

  if (supportId) {
    await query(`
      INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, capability_scopes, escalation_policy)
      VALUES
        ('Support - Tier 1', 'Initial customer inquiries',  'active',  'basic', $1, 250, 500, ARRAY['read','email'],        '{"timeout_hours":1,"escalate_to":null}'),
        ('Support - Tier 2', 'Escalated support issues',    'paused',  'basic', $1, 250, 500, ARRAY['read','write','email'],'{"timeout_hours":2,"escalate_to":null}')
    `, [supportId])
  }

  // Approvals — 3 pending high-risk actions
  const agents = await query(`SELECT id FROM agents LIMIT 4`)
  const ids = agents.rows.map((r: {id:number}) => r.id)
  if (ids.length >= 3) {
    await query(`
      INSERT INTO approvals (agent_id, request_type, request_details, status)
      VALUES
        ($1, 'cost_increase',     '{"action":"bulk_email_send","recipients":12000,"estimated_cost":340,"risk":"critical"}',       'pending'),
        ($2, 'resource_upgrade',  '{"action":"delete_database_records","table":"user_sessions","count":45000,"risk":"critical"}', 'pending'),
        ($3, 'config_change',     '{"action":"deploy_to_production","version":"2.1.4","risk":"high"}',                           'pending')
    `, [ids[0], ids[1], ids[2]])
  }

  // Seed audit logs
  if (acmeId) {
    await query(`
      INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
      VALUES
        ($1, 'agent_created',         1, '{"name":"Acme Corp AI Squad","tier":"enterprise"}'),
        ($1, 'budget_updated',        1, '{"budget_limit_usd":10000}'),
        ($1, 'approval_approved',     1, '{"notes":"Reviewed and approved","approval_id":1}'),
        ($1, 'agent_status_changed',  1, '{"status":"active"}')
    `, [acmeId])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === 'create-schema' || action === 'full-init') {
      await ensureSchema()
      if (action === 'full-init') await seedData()
      return NextResponse.json({ success: true, message: 'Schema ready' })
    }

    if (action === 'seed-data') {
      await ensureSchema() // ensure schema is up-to-date first
      await seedData()
      return NextResponse.json({ success: true, message: 'Seed data inserted' })
    }

    if (action === 'migrate-columns') {
      await ensureSchema()
      return NextResponse.json({ success: true, message: 'Columns migrated' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Setup error:', error)
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `)
    const tables = result.rows.map((r: { table_name: string }) => r.table_name)

    // Also check columns on agents table
    const cols = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'agents' ORDER BY ordinal_position
    `)

    return NextResponse.json({
      tables,
      agent_columns: cols.rows.map((r: { column_name: string }) => r.column_name),
      message: 'Database connection successful',
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Connection failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
