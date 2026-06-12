import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/webhooks — list current user's webhook configs
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await query(
      `SELECT id, provider, url, events, enabled, created_at, last_fired_at, last_status
       FROM webhook_configs WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.userId],
    )
    return NextResponse.json({ webhooks: result.rows })
  } catch (error) {
    console.error('[v0] Webhooks GET error:', error)
    return NextResponse.json({ error: 'Failed to load webhooks' }, { status: 500 })
  }
}

// POST /api/webhooks — create a webhook config
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { provider, url, events } = await req.json()

    if (!['slack', 'teams', 'generic'].includes(provider)) {
      return NextResponse.json({ error: 'Provider must be slack, teams, or generic' }, { status: 400 })
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 })
    }

    const validEvents = ['approval.pending', 'approval.decided', 'budget.alert']
    const selectedEvents: string[] = Array.isArray(events)
      ? events.filter((e: string) => validEvents.includes(e))
      : validEvents
    if (selectedEvents.length === 0) {
      return NextResponse.json({ error: 'Select at least one event' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO webhook_configs (user_id, provider, url, events)
       VALUES ($1, $2, $3, $4)
       RETURNING id, provider, url, events, enabled, created_at, last_fired_at, last_status`,
      [session.userId, provider, url, selectedEvents],
    )
    return NextResponse.json({ webhook: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('[v0] Webhooks POST error:', error)
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }
}
