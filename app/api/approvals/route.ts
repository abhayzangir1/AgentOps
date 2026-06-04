import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Approval } from '@/lib/types'

export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM approvals 
       WHERE status IN ('pending', 'approved', 'rejected')
       ORDER BY created_at DESC`,
    )

    return NextResponse.json(result.rows as Approval[])
  } catch (error) {
    console.error('[v0] GET /api/approvals error:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agent_id,
      request_type,
      request_details,
      requested_by_user_id = 1,
    } = body

    const result = await query(
      `INSERT INTO approvals (agent_id, request_type, request_details, requested_by_user_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [agent_id, request_type, JSON.stringify(request_details), requested_by_user_id, 'pending'],
    )

    return NextResponse.json(result.rows[0] as Approval, { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/approvals error:', error)
    return NextResponse.json({ error: 'Failed to create approval request' }, { status: 500 })
  }
}
