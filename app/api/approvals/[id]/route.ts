import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Approval } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, notes, assigned_to_user_id } = body

    const updateParts: string[] = []
    const values: any[] = []
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

    values.push(parseInt(id))

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

    return NextResponse.json(result.rows[0] as Approval)
  } catch (error) {
    console.error('[v0] PATCH /api/approvals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }
}
