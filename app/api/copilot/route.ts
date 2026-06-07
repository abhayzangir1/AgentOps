import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { invokeModel, isBedrockConfigured } from '@/lib/bedrock'

export const maxDuration = 60

// POST /api/copilot — operational assistant grounded in live platform data
export async function POST(req: NextRequest) {
  try {
    if (!isBedrockConfigured()) {
      return NextResponse.json({ error: 'Copilot not configured', configured: false }, { status: 503 })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // Gather a compact, live snapshot of the platform so answers are grounded.
    const [agents, approvals, audit] = await Promise.all([
      query(
        `SELECT id, name, status, tier, monthly_cost_usd, budget_limit_usd, parent_agent_id, capability_scopes
         FROM agents ORDER BY id LIMIT 50`,
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT id, agent_id, request_type, status, created_at FROM approvals
         WHERE status = 'pending' ORDER BY created_at DESC LIMIT 25`,
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT action, agent_id, actor_user_id, created_at FROM audit_logs
         ORDER BY created_at DESC LIMIT 15`,
      ).catch(() => ({ rows: [] })),
    ])

    const totalSpend = agents.rows.reduce((s: number, a: { monthly_cost_usd?: number }) => s + Number(a.monthly_cost_usd ?? 0), 0)
    const overBudget = agents.rows.filter(
      (a: { monthly_cost_usd?: number; budget_limit_usd?: number | null }) =>
        a.budget_limit_usd != null && Number(a.monthly_cost_usd ?? 0) > Number(a.budget_limit_usd),
    )

    const context = {
      summary: {
        totalAgents: agents.rows.length,
        activeAgents: agents.rows.filter((a: { status: string }) => a.status === 'active').length,
        pendingApprovals: approvals.rows.length,
        totalMonthlySpendUSD: Number(totalSpend.toFixed(2)),
        agentsOverBudget: overBudget.map((a: { name: string }) => a.name),
      },
      agents: agents.rows,
      pendingApprovals: approvals.rows,
      recentAudit: audit.rows,
    }

    const system = `You are AgentOps Copilot, an operations assistant embedded in an enterprise AI-agent governance platform (think "Jira + Workday for autonomous AI workers"). Answer the operator's questions using ONLY the live platform context provided below. Be concise and specific — cite agent names, dollar amounts, and counts. If the answer is not in the context, say so plainly. Use short markdown when helpful (bullets, bold). Never invent data.

LIVE PLATFORM CONTEXT (JSON):
${JSON.stringify(context)}`

    const convo = messages
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))

    const reply = await invokeModel(
      [{ role: 'system', content: system }, ...convo],
      { maxTokens: 900, temperature: 0.4 },
    )

    return NextResponse.json({ configured: true, reply, snapshot: context.summary })
  } catch (error) {
    console.error('[v0] POST /api/copilot error:', error)
    return NextResponse.json({ error: 'Copilot request failed', details: String(error) }, { status: 500 })
  }
}
