import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Approval } from '@/lib/types'
import { getSession } from '@/lib/auth'
import { dispatchWebhookEvent } from '@/lib/webhooks'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.userId

    const { id } = await params
    const approvalId = parseInt(id, 10)
    if (Number.isNaN(approvalId)) {
      return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 })
    }

    // Ownership check: the approval must belong to one of the user's agents
    const ownerRes = await query(
      `SELECT a.owner_user_id
         FROM approvals ap
         JOIN agents a ON a.id = ap.agent_id
        WHERE ap.id = $1`,
      [approvalId],
    )
    if (ownerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }
    if (ownerRes.rows[0].owner_user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { status, notes, assigned_to_user_id, request_details } = body

    const updateParts: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (status) {
      updateParts.push(`status = $${paramIndex++}`)
      values.push(status)
      if (status !== 'pending') {
        updateParts.push(`resolved_at = $${paramIndex++}`)
        values.push(new Date().toISOString())
      }
    }

    if (notes) {
      updateParts.push(`notes = $${paramIndex++}`)
      values.push(notes)
    }

    if (assigned_to_user_id) {
      updateParts.push(`assigned_to_user_id = $${paramIndex++}`)
      values.push(assigned_to_user_id)
    }

    // "Modify" action — supervisor edits the agent's requested payload before deciding.
    if (request_details !== undefined) {
      updateParts.push(`request_details = $${paramIndex++}`)
      values.push(JSON.stringify(request_details))
    }

    if (updateParts.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(approvalId)

    const result = await query(
      `UPDATE approvals 
       SET ${updateParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Record audit log
    const approval = result.rows[0]
    if (status) {
      await query(
        `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [approval.agent_id, `approval_${status}`, userId, JSON.stringify({ notes: notes || 'No notes', approval_id: parseInt(id) })],
      ).catch(() => {})
    } else if (request_details !== undefined) {
      await query(
        `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [approval.agent_id, 'approval_modified', userId, JSON.stringify({ approval_id: parseInt(id), notes: notes || 'Payload modified by reviewer' })],
      ).catch(() => {})
    }

    // Fire external alerts (Slack / Teams / generic) for decisions — fire-and-forget
    if (status && status !== 'pending') {
      dispatchWebhookEvent({
        event: 'approval.decided',
        title: `Approval #${id} ${status}`,
        message: `A "${approval.request_type ?? 'agent action'}" request was ${status} by a reviewer.`,
        severity: status === 'rejected' ? 'warning' : 'info',
        metadata: {
          approval_id: parseInt(id),
          agent_id: approval.agent_id,
          decision: status,
          request_type: approval.request_type ?? 'unknown',
        },
      }).catch(() => {})
    }

    return NextResponse.json(result.rows[0] as Approval)
  } catch (error) {
    console.error('[v0] PATCH /api/approvals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }
}
