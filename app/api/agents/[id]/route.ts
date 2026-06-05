import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const agentId = parseInt(id, 10)
    const body = await req.json()
    const { status, name, description, tier, monthly_cost_usd, budget_limit_usd, parent_agent_id } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (tier !== undefined) {
      updates.push(`tier = $${paramIndex++}`)
      values.push(tier)
    }
    if (monthly_cost_usd !== undefined) {
      updates.push(`monthly_cost_usd = $${paramIndex++}`)
      values.push(monthly_cost_usd)
    }
    if (budget_limit_usd !== undefined) {
      updates.push(`budget_limit_usd = $${paramIndex++}`)
      values.push(budget_limit_usd)
    }
    if (parent_agent_id !== undefined) {
      updates.push(`parent_agent_id = $${paramIndex++}`)
      values.push(parent_agent_id)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(agentId)

    const result = await query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd, created_at, updated_at`,
      values,
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Record audit log for status changes
    if (status !== undefined) {
      await query(
        `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [agentId, 'agent_status_changed', 1, JSON.stringify({ status })],
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[v0] PATCH /api/agents/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const agentId = parseInt(id, 10)

    const result = await query('DELETE FROM agents WHERE id = $1 RETURNING id', [agentId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE /api/agents/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
  }
}
