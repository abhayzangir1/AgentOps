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
        'Set default budget limits by tier'
      ]
    })
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: String(error) }, { status: 500 })
  }
}
