import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH /api/webhooks/[id] — toggle enabled / update events
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { enabled, events, url } = await req.json()

    const updateParts: string[] = []
    const values: unknown[] = []
    let i = 1

    if (typeof enabled === 'boolean') {
      updateParts.push(`enabled = $${i++}`)
      values.push(enabled)
    }
    if (Array.isArray(events) && events.length > 0) {
      updateParts.push(`events = $${i++}`)
      values.push(events)
    }
    if (typeof url === 'string' && url.length > 0) {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol')
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
      }
      updateParts.push(`url = $${i++}`)
      values.push(url)
    }
    if (updateParts.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    values.push(parseInt(id), session.userId)
    const result = await query(
      `UPDATE webhook_configs SET ${updateParts.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING id, provider, url, events, enabled, created_at, last_fired_at, last_status`,
      values,
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    return NextResponse.json({ webhook: result.rows[0] })
  } catch (error) {
    console.error('[v0] Webhook PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
}

// DELETE /api/webhooks/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const result = await query(
      `DELETE FROM webhook_configs WHERE id = $1 AND user_id = $2 RETURNING id`,
      [parseInt(id), session.userId],
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[v0] Webhook DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}
