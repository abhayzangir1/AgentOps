import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const userId = session?.userId ?? 1

    const { id } = await params
    const agentId = parseInt(id, 10)
    const body = await req.json()
    const { status, name, description, tier, monthly_cost_usd, budget_limit_usd, parent_agent_id, capability_scopes, escalation_policy } = body

    const updates: string[] = []
    const values: unknown[] = []
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
    if (capability_scopes !== undefined) {
      updates.push(`capability_scopes = $${paramIndex++}`)
      values.push(capability_scopes)
    }
    if (escalation_policy !== undefined) {
      updates.push(`escalation_policy = $${paramIndex++}`)
      values.push(JSON.stringify(escalation_policy))
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(agentId)

    const result = await query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd,
         COALESCE(capability_scopes, '{}') as capability_scopes, escalation_policy, created_at, updated_at`,
      values,
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Audit log for status changes
    if (status !== undefined) {
      await query(
        `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
         VALUES ($1, 'agent_status_changed', $2, $3)`,
        [agentId, userId, JSON.stringify({ status })],
      ).catch(() => {})
    }

    // Audit log for budget changes
    if (budget_limit_usd !== undefined) {
      await query(
        `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
         VALUES ($1, 'budget_updated', $2, $3)`,
        [agentId, userId, JSON.stringify({ budget_limit_usd })],
      ).catch(() => {})
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[v0] PATCH /api/agents/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const userId = session?.userId ?? 1

    const { id } = await params
    const agentId = parseInt(id, 10)

    // Get agent name for audit log before deletion
    const agentResult = await query('SELECT name FROM agents WHERE id = $1', [agentId])
    if (agentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    const agentName = agentResult.rows[0].name

    const result = await query('DELETE FROM agents WHERE id = $1 RETURNING id', [agentId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
       VALUES (NULL, 'agent_deleted', $1, $2)`,
      [userId, JSON.stringify({ agent_id: agentId, name: agentName })],
    ).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE /api/agents/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
  }
}
