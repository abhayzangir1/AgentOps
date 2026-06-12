import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { invokeModel } from '@/lib/bedrock'

// POST /api/audit-logs/summarize — Bedrock LLM compliance summary of recent audit activity
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const logs = await query(
      `SELECT al.action, al.details, al.created_at, a.name AS agent_name, u.name AS actor_name
       FROM audit_logs al
       LEFT JOIN agents a ON a.id = al.agent_id
       LEFT JOIN users u ON u.id = al.actor_user_id
       ORDER BY al.created_at DESC
       LIMIT 50`,
    )

    if (logs.rows.length === 0) {
      return NextResponse.json({ summary: 'No audit activity recorded yet.' })
    }

    const lines = logs.rows
      .map(
        (r: { action: string; details: unknown; created_at: string; agent_name: string | null; actor_name: string | null }) =>
          `[${new Date(r.created_at).toISOString()}] action=${r.action} agent=${r.agent_name ?? 'n/a'} actor=${r.actor_name ?? 'system'} details=${JSON.stringify(r.details ?? {}).slice(0, 200)}`,
      )
      .join('\n')

    const text = await invokeModel(
      [
        {
          role: 'system',
          content: 'You are a precise compliance analyst for an AI agent governance platform. Only reference events present in the provided data.',
        },
        {
          role: 'user',
          content: `Summarize the following audit log (most recent 50 entries) for an operations review. Structure your answer as:\n1. Overview (1-2 sentences)\n2. Notable patterns or anomalies (bullets)\n3. Compliance risks to watch (bullets, if any)\nBe concise and factual. Do not invent events not present in the log.\n\nAUDIT LOG:\n${lines}`,
        },
      ],
      { maxTokens: 900, temperature: 0.2 },
    )

    return NextResponse.json({ summary: text, entries_analyzed: logs.rows.length })
  } catch (error) {
    console.error('[v0] Audit summarize error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
