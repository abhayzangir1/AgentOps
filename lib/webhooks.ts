import { query } from '@/lib/db'

export type WebhookEvent = 'approval.pending' | 'approval.decided' | 'budget.alert' | 'test'

export interface WebhookPayload {
  event: WebhookEvent
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  metadata?: Record<string, string | number>
}

/** Format payload for the target provider's expected schema. */
function formatBody(provider: string, p: WebhookPayload): Record<string, unknown> {
  const metaLines = Object.entries(p.metadata ?? {})
    .map(([k, v]) => `• *${k}*: ${v}`)
    .join('\n')

  if (provider === 'slack') {
    return {
      text: `${p.title} — ${p.message}`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: p.title } },
        { type: 'section', text: { type: 'mrkdwn', text: p.message + (metaLines ? `\n${metaLines}` : '') } },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `AgentOps • ${p.event} • severity: ${p.severity}` }],
        },
      ],
    }
  }

  if (provider === 'teams') {
    // Microsoft Teams incoming webhook (Adaptive Card via connector card schema)
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: p.severity === 'critical' ? 'D13438' : p.severity === 'warning' ? 'F2C811' : '0078D4',
      summary: p.title,
      sections: [
        {
          activityTitle: p.title,
          activitySubtitle: `AgentOps • ${p.event}`,
          text: p.message,
          facts: Object.entries(p.metadata ?? {}).map(([name, value]) => ({ name, value: String(value) })),
        },
      ],
    }
  }

  // Generic JSON webhook
  return {
    source: 'agentops',
    event: p.event,
    severity: p.severity,
    title: p.title,
    message: p.message,
    metadata: p.metadata ?? {},
    timestamp: new Date().toISOString(),
  }
}

/** Send a payload to a single webhook URL. Returns HTTP status (0 on network error). */
export async function sendWebhook(provider: string, url: string, payload: WebhookPayload): Promise<number> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatBody(provider, payload)),
      signal: AbortSignal.timeout(8000),
    })
    return res.status
  } catch {
    return 0
  }
}

/**
 * Dispatch an event to all enabled webhooks (for all users) subscribed to it.
 * Fire-and-forget: failures are recorded on the config row, never thrown.
 */
export async function dispatchWebhookEvent(payload: WebhookPayload): Promise<void> {
  try {
    const configs = await query(
      `SELECT id, provider, url FROM webhook_configs
       WHERE enabled = TRUE AND $1 = ANY(events)`,
      [payload.event],
    )

    await Promise.allSettled(
      configs.rows.map(async (cfg: { id: number; provider: string; url: string }) => {
        const status = await sendWebhook(cfg.provider, cfg.url, payload)
        await query(
          `UPDATE webhook_configs SET last_fired_at = NOW(), last_status = $2 WHERE id = $1`,
          [cfg.id, status],
        ).catch(() => {})
      }),
    )
  } catch (error) {
    console.error('[v0] Webhook dispatch error:', error)
  }
}
