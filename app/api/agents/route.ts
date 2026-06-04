import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Agent } from '@/lib/types'

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        id, name, description, status, tier, parent_agent_id, 
        monthly_cost_usd, created_at, updated_at
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
    const {
      name,
      description,
      status = 'active',
      tier = 'basic',
      parent_agent_id,
      monthly_cost_usd = 0,
    } = body

    const result = await query(
      `INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, status, tier, parent_agent_id, monthly_cost_usd, created_at, updated_at`,
      [name, description || null, status, tier, parent_agent_id || null, monthly_cost_usd, 1],
    )

    return NextResponse.json(result.rows[0] as Agent, { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/agents error:', error)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
