import { NextRequest, NextResponse } from 'next/server'
import { validateAgentToken } from '@/lib/agent-auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agent = await validateAgentToken(req)
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized: invalid or missing API key' }, { status: 401 })
  }

  const { id } = await params

  // Fetch the gateway request and ensure it belongs to this agent
  const result = await query(
    `SELECT id, status, decision_reason, decided_at, expires_at
     FROM gateway_requests
     WHERE id = $1 AND agent_id = $2`,
    [id, agent.agent_id],
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Request not found or expired' }, { status: 404 })
  }

  const { status, decision_reason, decided_at, expires_at } = result.rows[0]

  // Check if expired
  if (new Date(expires_at) < new Date()) {
    return NextResponse.json(
      {
        status: 'expired',
        reason: 'Approval request expired (24-hour timeout)',
      },
      { status: 410 },
    )
  }

  return NextResponse.json({
    status,
    reason: decision_reason,
    decided_at,
    decided: status !== 'pending',
  })
}
