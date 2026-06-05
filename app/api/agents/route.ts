import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Agent } from '@/lib/types'
import { validateAgentInput, ValidationError } from '@/lib/validation'

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        id, name, description, status, tier, parent_agent_id, 
        monthly_cost_usd, budget_limit_usd, created_at, updated_at
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
    const body = await req.json()
    
    // Validate input
    const validated = validateAgentInput(body)

    const result = await query(
      `INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, created_at, updated_at`,
      [
        validated.name, 
        validated.description, 
        validated.status, 
        validated.tier, 
        validated.parent_agent_id || null, 
        validated.monthly_cost_usd,
        validated.budget_limit_usd || null,
        1
      ],
    )

    return NextResponse.json(result.rows[0] as Agent, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[v0] POST /api/agents error:', error)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
