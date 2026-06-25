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
    const result = await query(
      `SELECT a.* FROM approvals a
       JOIN agents ag ON a.agent_id = ag.id
       WHERE ag.owner_user_id = $1 AND a.status IN ('pending', 'approved', 'rejected')
       ORDER BY a.created_at DESC`,
      [session.userId],
    )

    return NextResponse.json(result.rows as Approval[])
  } catch (error) {
    console.error('[v0] GET /api/approvals error:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const userId = session?.userId ?? 1

    const body = await req.json()
    const {
      agent_id,
      request_type,
      request_details,
    } = body

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
