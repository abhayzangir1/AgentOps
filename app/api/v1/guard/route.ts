import { NextRequest, NextResponse } from 'next/server'
import { validateAgentToken } from '@/lib/agent-auth'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const agent = await validateAgentToken(req)
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized: invalid or missing API key' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { action_type, estimated_cost, requested_scope, metadata } = body

  if (!action_type) {
    return NextResponse.json({ error: 'Missing action_type' }, { status: 400 })
  }

  // Fetch agent details (budget, capabilities, status)
  const agentRes = await query(
    `SELECT budget_limit_usd, budget_used_usd, capability_scopes, status 
     FROM agents WHERE id = $1`,
    [agent.agent_id],
  )

  if (agentRes.rows.length === 0) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const {
    budget_limit_usd: budgetLimit,
    budget_used_usd: budgetUsed,
    capability_scopes: capabilityScopes,
    status: agentStatus,
  } = agentRes.rows[0]

  // Check 1: Agent status. 'disabled' is the budget-overspend lockout state
  // (the agents.status CHECK constraint allows active/paused/inactive/disabled).
  if (agentStatus === 'disabled' || agentStatus === 'inactive') {
    return NextResponse.json(
      {
        decision: 'denied',
        reason: 'Agent is disabled (budget overspend or deactivated by administrator)',
        request_id: null,
      },
      { status: 403 },
    )
  }

  if (agentStatus === 'paused') {
    return NextResponse.json(
      {
        decision: 'denied',
        reason: 'Agent is paused by administrator',
        request_id: null,
      },
      { status: 403 },
    )
  }

  // Check 2: Capability scope (does the agent have permission to perform this action?)
  const scopes = capabilityScopes ?? []
  if (scopes.length > 0 && !scopes.includes(action_type)) {
    return NextResponse.json(
      {
        decision: 'denied',
        reason: `Capability '${action_type}' not in allowed scopes: ${scopes.join(', ')}`,
        request_id: null,
      },
      { status: 403 },
    )
  }

  // Check 3: Budget enforcement (auto-freeze if over-spend)
  const cost = estimated_cost ?? 0
  const projectedTotal = (budgetUsed ?? 0) + cost
  if (budgetLimit && projectedTotal > budgetLimit) {
    // Auto-disable the agent to prevent further spend ('disabled' is the
    // budget lockout state allowed by the agents.status CHECK constraint).
    await query(`UPDATE agents SET status = 'disabled', updated_at = NOW() WHERE id = $1`, [agent.agent_id])

    return NextResponse.json(
      {
        decision: 'denied',
        reason: `Projected cost $${projectedTotal.toFixed(2)} exceeds budget limit $${budgetLimit.toFixed(2)}. Agent disabled.`,
        request_id: null,
      },
      { status: 403 },
    )
  }

  // Check 4: Risky actions require HITL approval
  // (Low-cost or routine actions auto-approve; flagged actions create an approval request)
  const isRiskyAction = cost > 100 || action_type.includes('delete') || action_type.includes('rollback')

  if (isRiskyAction) {
    // Create a gateway request (HITL approval)
    const approvalRes = await query(
      `INSERT INTO gateway_requests 
       (agent_id, user_id, request_type, request_details, status, requested_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING id`,
      [
        agent.agent_id,
        agent.user_id,
        action_type,
        JSON.stringify({
          estimated_cost: cost,
          requested_scope,
          metadata,
          budget_remaining: budgetLimit ? (budgetLimit - budgetUsed).toFixed(2) : null,
        }),
      ],
    )

    const requestId = approvalRes.rows[0]?.id

    return NextResponse.json(
      {
        decision: 'pending',
        reason: 'High-risk action requires human approval',
        request_id: requestId,
        poll_interval_ms: 2000,
      },
      { status: 202 },
    )
  }

  // Low-risk actions auto-approve (no approval needed)
  return NextResponse.json({
    decision: 'approved',
    reason: 'Low-risk action auto-approved',
    request_id: null,
  })
}
