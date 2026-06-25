import { NextRequest, NextResponse } from 'next/server'
import { validateAgentToken } from '@/lib/agent-auth'
import { recordActivity } from '@/lib/dynamodb'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const agent = await validateAgentToken(req)
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized: invalid or missing API key' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { action_type, action_description, status, cost, metadata, request_id } = body

  if (!action_type) {
    return NextResponse.json({ error: 'Missing action_type' }, { status: 400 })
  }

  try {
    // Record in DynamoDB (real-time activity stream)
    const activity = await recordActivity({
      agentId: agent.agent_id,
      eventType: (action_type.includes('delete') ? 'error' : 'execution') as 'execution' | 'error' | 'approval' | 'deployment',
      timestamp: Date.now(),
      description: action_description || `${action_type} executed`,
      status: (status as 'success' | 'pending' | 'failed') || 'success',
      costUSD: cost ?? 0,
      metadata: metadata || {},
    })

    // Update agent's budget_used_usd if cost was incurred
    if (cost > 0) {
      await query(`UPDATE agents SET budget_used_usd = (COALESCE(budget_used_usd, 0) + $1) WHERE id = $2`, [
        cost,
        agent.agent_id,
      ]).catch(() => {})
    }

    // If this was triggered by a gateway /guard request, mark it as completed
    if (request_id) {
      await query(
        `UPDATE gateway_requests SET status = 'approved', decided_at = NOW() WHERE id = $1`,
        [request_id],
      ).catch(() => {})
    }

    // Record in Aurora audit trail
    await query(
      `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [
        agent.agent_id,
        `gateway_${action_type}`,
        agent.user_id,
        JSON.stringify({ cost, status, request_id, metadata }),
      ],
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      activity_id: activity.eventId,
      cost_applied: cost,
      message: 'Activity recorded',
    })
  } catch (err) {
    console.error('[v0] activity recording failed:', err)
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 })
  }
}
