import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Agent } from '@/lib/types'
import { validateAgentInput, ValidationError } from '@/lib/validation'

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        id, name, description, status, tier, parent_agent_id, 
        monthly_cost_usd, budget_limit_usd,
        COALESCE(capability_scopes, '{}') as capability_scopes,
        escalation_policy,
        created_at, updated_at
      FROM agents 
      ORDER BY created_at DESC`,
    )

    return NextResponse.json(result.rows as Agent[])
  } catch (error) {
    console.error('[v0] GET /api/agents error:', error)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const userId = session?.userId ?? 1

    const body = await req.json()
    
    const validated = validateAgentInput(body)

    // Starter tier is free but limited to 3 agents. Growth ($49/agent/mo via
    // Razorpay) and Enterprise (custom) are unlimited here.
    const STARTER_AGENT_LIMIT = 3
    const planRes = await query(`SELECT plan FROM users WHERE id = $1`, [userId])
    const plan: string = planRes.rows[0]?.plan ?? 'starter'

    if (plan === 'starter') {
      const countRes = await query(`SELECT COUNT(*)::int AS n FROM agents`)
      if (countRes.rows[0].n >= STARTER_AGENT_LIMIT) {
        return NextResponse.json(
          {
            error: `Starter plan is limited to ${STARTER_AGENT_LIMIT} agents. Upgrade to Growth ($49/agent/month) in Plans & Billing to add more.`,
            code: 'PLAN_LIMIT_REACHED',
            limit: STARTER_AGENT_LIMIT,
          },
          { status: 403 },
        )
      }
    }

    const result = await query(
      `INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, capability_scopes, escalation_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd,
         COALESCE(capability_scopes, '{}') as capability_scopes, escalation_policy, created_at, updated_at`,
      [
        validated.name, 
        validated.description, 
        validated.status, 
        validated.tier, 
        validated.parent_agent_id ?? null, 
        validated.monthly_cost_usd,
        validated.budget_limit_usd ?? null,
        validated.capability_scopes ?? [],
        JSON.stringify(validated.escalation_policy ?? { timeout_hours: 24, escalate_to: null }),
      ],
    )

    // Audit log
    await query(
      `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
       VALUES ($1, 'agent_created', $2, $3)`,
      [result.rows[0].id, userId, JSON.stringify({ name: validated.name, tier: validated.tier })],
    ).catch(() => {})

    return NextResponse.json(result.rows[0] as Agent, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[v0] POST /api/agents error:', error)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
