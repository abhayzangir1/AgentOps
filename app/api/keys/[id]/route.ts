import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// DELETE /api/keys/[id] — revoke an API key (soft delete, keeps audit trail)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const result = await query(
      `UPDATE api_keys SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [parseInt(id), session.userId],
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 })
    }
    return NextResponse.json({ revoked: true })
  } catch (error) {
    console.error('[v0] Key revoke error:', error)
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
  }
}
