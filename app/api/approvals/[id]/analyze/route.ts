import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { analyzeApprovalRisk, isBedrockConfigured } from '@/lib/bedrock'

export const maxDuration = 60

// POST /api/approvals/[id]/analyze — run LLM risk analysis for one pending approval
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const approvalId = parseInt(id)

    if (!isBedrockConfigured()) {
      return NextResponse.json(
        { error: 'Bedrock is not configured', configured: false },
        { status: 503 },
      )
    }

    const result = await query(
      `SELECT ap.*, a.name AS agent_name, a.tier AS agent_tier,
              a.monthly_cost_usd, a.budget_limit_usd, a.capability_scopes
       FROM approvals ap
       JOIN agents a ON a.id = ap.agent_id
       WHERE ap.id = $1`,
      [approvalId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    const row = result.rows[0]

    const analysis = await analyzeApprovalRisk({
      agentName: row.agent_name,
      agentTier: row.agent_tier,
      requestType: row.request_type,
      requestDetails: row.request_details ?? {},
      monthlyCost: Number(row.monthly_cost_usd ?? 0),
      budgetLimit: row.budget_limit_usd != null ? Number(row.budget_limit_usd) : null,
      capabilityScopes: row.capability_scopes ?? [],
    })

    return NextResponse.json({ configured: true, analysis })
  } catch (error) {
    console.error('[v0] POST /api/approvals/[id]/analyze error:', error)
    return NextResponse.json(
      { error: 'Risk analysis failed', details: String(error) },
      { status: 500 },
    )
  }
}
