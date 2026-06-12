import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendWebhook } from '@/lib/webhooks'

// POST /api/webhooks/[id]/test — fire a real test payload at the configured URL
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const result = await query(
      `SELECT id, provider, url FROM webhook_configs WHERE id = $1 AND user_id = $2`,
      [parseInt(id), session.userId],
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const cfg = result.rows[0]
    const status = await sendWebhook(cfg.provider, cfg.url, {
      event: 'test',
      title: 'AgentOps test alert',
      message: 'This is a test notification from your AgentOps webhook configuration. If you can read this, delivery works.',
      severity: 'info',
      metadata: { triggered_by: session.email ?? 'unknown', webhook_id: cfg.id },
    })

    await query(
      `UPDATE webhook_configs SET last_fired_at = NOW(), last_status = $2 WHERE id = $1`,
      [cfg.id, status],
    ).catch(() => {})

    const ok = status >= 200 && status < 300
    return NextResponse.json(
      { delivered: ok, status },
      { status: ok ? 200 : 502 },
    )
  } catch (error) {
    console.error('[v0] Webhook test error:', error)
    return NextResponse.json({ error: 'Failed to send test' }, { status: 500 })
  }
}
