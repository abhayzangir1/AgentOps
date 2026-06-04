import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { AuditLog } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const agentId = searchParams.get('agentId')

    let sql = `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
    const params: any[] = []

    if (agentId) {
      sql = `SELECT * FROM audit_logs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 100`
      params.push(parseInt(agentId))
    }

    const result = await query(sql, params)
    return NextResponse.json(result.rows as AuditLog[])
  } catch (error) {
    console.error('[v0] GET /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agent_id,
      event_type,
      event_description,
      user_id = 1,
      previous_state,
      new_state,
    } = body

    const result = await query(
      `INSERT INTO audit_logs (agent_id, event_type, event_description, user_id, previous_state, new_state)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        agent_id || null,
        event_type,
        event_description,
        user_id,
        previous_state ? JSON.stringify(previous_state) : null,
        new_state ? JSON.stringify(new_state) : null,
      ],
    )

    return NextResponse.json(result.rows[0] as AuditLog, { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}
