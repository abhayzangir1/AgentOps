import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Approval } from '@/lib/types'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Per-user workspace: only approvals for user's own agents
    // Get both traditional approvals + gateway_requests (HITL flows)
    const [approvalRes, gatewayRes] = await Promise.all([
      query(
        `SELECT a.* FROM approvals a
         JOIN agents ag ON a.agent_id = ag.id
         WHERE ag.owner_user_id = $1 AND a.status IN ('pending', 'approved', 'rejected')
         ORDER BY a.created_at DESC`,
        [session.userId],
      ),
      query(
        `SELECT 
          gr.id, gr.agent_id, gr.request_type, gr.request_details, gr.status,
          gr.decision_reason, gr.decided_by_user_id, gr.requested_at AS created_at,
          gr.decided_at, ag.name AS agent_name
         FROM gateway_requests gr
         JOIN agents ag ON gr.agent_id = ag.id
         WHERE gr.user_id = $1 AND gr.status IN ('pending', 'approved', 'denied')
         ORDER BY gr.requested_at DESC`,
        [session.userId],
      ),
    ])

    // Merge results
    const approvals = [
      ...approvalRes.rows,
      ...gatewayRes.rows.map((gr: any) => ({
        id: gr.id,
        agent_id: gr.agent_id,
        agent_name: gr.agent_name,
        request_type: gr.request_type,
        request_details: gr.request_details,
        status: gr.status === 'denied' ? 'rejected' : gr.status,
        created_at: gr.created_at,
        decided_at: gr.decided_at,
        decision_reason: gr.decision_reason,
      })),
    ].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json(approvals)
  } catch (error) {
    console.error('[v0] GET /api/approvals error:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.userId

    const body = await req.json()
    const {
      agent_id,
      request_type,
      request_details,
    } = body

    // Verify the target agent belongs to the requesting user
    const ownerRes = await query('SELECT owner_user_id FROM agents WHERE id = $1', [agent_id])
    if (ownerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    if (ownerRes.rows[0].owner_user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await query(
      `INSERT INTO approvals (agent_id, request_type, request_details, requested_by_user_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [agent_id, request_type, JSON.stringify(request_details), userId, 'pending'],
    )

    // Audit log
    await query(
      `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
       VALUES ($1, 'approval_requested', $2, $3)`,
      [agent_id, userId, JSON.stringify({ request_type })],
    ).catch(() => {})

    return NextResponse.json(result.rows[0] as Approval, { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/approvals error:', error)
    return NextResponse.json({ error: 'Failed to create approval request' }, { status: 500 })
  }
}
