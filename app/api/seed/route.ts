import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { recordActivity } from '@/lib/dynamodb'

// Sample agents representing a real enterprise setup
const SAMPLE_AGENTS = [
  {
    name: 'Enterprise AI Hub',
    description: 'Central orchestration for all enterprise AI operations',
    status: 'active',
    tier: 'enterprise',
    parent_agent_id: null,
    monthly_cost_usd: 5000,
    budget_limit_usd: 6000,
  },
  {
    name: 'DataFlow Pipeline',
    description: 'Real-time ETL and data processing system',
    status: 'active',
    tier: 'pro',
    parent_agent_id: null,
    monthly_cost_usd: 2500,
    budget_limit_usd: 3000,
  },
  {
    name: 'ContentGen Pro',
    description: 'AI-powered content generation and management',
    status: 'active',
    tier: 'pro',
    parent_agent_id: null,
    monthly_cost_usd: 1500,
    budget_limit_usd: 2000,
  },
  {
    name: 'Support Automation',
    description: 'Customer support ticket handling and response',
    status: 'paused',
    tier: 'basic',
    parent_agent_id: null,
    monthly_cost_usd: 500,
    budget_limit_usd: 750,
  },
]

// Child agents
const SAMPLE_CHILD_AGENTS = [
  { name: 'DataFlow - Ingestion', description: 'Data collection and normalization', status: 'active', tier: 'pro', monthly_cost_usd: 1000, budget_limit_usd: 1200, parentName: 'DataFlow Pipeline' },
  { name: 'DataFlow - Processing', description: 'ETL transformations and enrichment', status: 'active', tier: 'pro', monthly_cost_usd: 1000, budget_limit_usd: 1200, parentName: 'DataFlow Pipeline' },
  { name: 'DataFlow - Analytics', description: 'Real-time analytics engine', status: 'active', tier: 'pro', monthly_cost_usd: 500, budget_limit_usd: 600, parentName: 'DataFlow Pipeline' },
  { name: 'ContentGen - Blog', description: 'Blog post generation', status: 'active', tier: 'basic', monthly_cost_usd: 500, budget_limit_usd: 600, parentName: 'ContentGen Pro' },
  { name: 'ContentGen - Social', description: 'Social media content', status: 'active', tier: 'basic', monthly_cost_usd: 500, budget_limit_usd: 600, parentName: 'ContentGen Pro' },
  { name: 'Support - Tier 1', description: 'Initial customer inquiries', status: 'active', tier: 'basic', monthly_cost_usd: 250, budget_limit_usd: 300, parentName: 'Support Automation' },
  { name: 'Support - Tier 2', description: 'Escalated support issues', status: 'paused', tier: 'basic', monthly_cost_usd: 250, budget_limit_usd: 300, parentName: 'Support Automation' },
]

const SAMPLE_APPROVALS = [
  {
    request_type: 'resource_upgrade',
    request_details: { current_tier: 'pro', requested_tier: 'enterprise', reason: 'Increased processing demands' },
    status: 'pending',
    agentName: 'DataFlow Pipeline',
  },
  {
    request_type: 'budget_increase',
    request_details: { current_budget: 1500, requested_budget: 2500, justification: 'Expanded content coverage' },
    status: 'pending',
    agentName: 'ContentGen Pro',
  },
  {
    request_type: 'config_change',
    request_details: { parameter: 'batch_size', old_value: 100, new_value: 500 },
    status: 'pending',
    agentName: 'DataFlow - Ingestion',
  },
]

const SAMPLE_ACTIVITIES = [
  { agentId: 1, eventType: 'execution' as const, description: 'Enterprise AI Hub completed weekly analysis', status: 'success' as const, costUSD: 12.50, duration: 5400, timestamp: Date.now() - 300000 },
  { agentId: 2, eventType: 'execution' as const, description: 'DataFlow Pipeline processed 15,847 records', status: 'success' as const, costUSD: 2.45, duration: 3240, timestamp: Date.now() - 600000 },
  { agentId: 3, eventType: 'deployment' as const, description: 'ContentGen Pro deployed v2.1.0', status: 'success' as const, costUSD: 0.78, duration: 1820, timestamp: Date.now() - 900000 },
  { agentId: 4, eventType: 'error' as const, description: 'Support Automation rate limit exceeded', status: 'failed' as const, timestamp: Date.now() - 1200000 },
  { agentId: 5, eventType: 'approval' as const, description: 'DataFlow Ingestion resource upgrade pending', status: 'pending' as const, timestamp: Date.now() - 1500000 },
  { agentId: 6, eventType: 'execution' as const, description: 'DataFlow Processing completed batch job', status: 'success' as const, costUSD: 3.20, duration: 4500, timestamp: Date.now() - 1800000 },
  { agentId: 7, eventType: 'execution' as const, description: 'DataFlow Analytics generated hourly report', status: 'success' as const, costUSD: 0.95, duration: 1200, timestamp: Date.now() - 2100000 },
  { agentId: 8, eventType: 'deployment' as const, description: 'ContentGen Blog updated templates', status: 'success' as const, costUSD: 0.25, duration: 600, timestamp: Date.now() - 2400000 },
]

export async function POST() {
  try {
    const results = {
      agents: 0,
      approvals: 0,
      activities: 0,
      errors: [] as string[],
    }

    // 1. Seed parent agents
    const parentAgentIds: Record<string, number> = {}
    for (const agent of SAMPLE_AGENTS) {
      try {
        const result = await query(
          `INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (name) DO UPDATE SET 
             description = EXCLUDED.description,
             status = EXCLUDED.status,
             tier = EXCLUDED.tier,
             monthly_cost_usd = EXCLUDED.monthly_cost_usd,
             budget_limit_usd = EXCLUDED.budget_limit_usd
           RETURNING id`,
          [agent.name, agent.description, agent.status, agent.tier, agent.parent_agent_id, agent.monthly_cost_usd, agent.budget_limit_usd]
        )
        parentAgentIds[agent.name] = result.rows[0].id
        results.agents++
      } catch (error) {
        results.errors.push(`Agent ${agent.name}: ${error}`)
      }
    }

    // 2. Seed child agents
    for (const child of SAMPLE_CHILD_AGENTS) {
      try {
        const parentId = parentAgentIds[child.parentName]
        if (!parentId) continue
        
        const result = await query(
          `INSERT INTO agents (name, description, status, tier, parent_agent_id, monthly_cost_usd, budget_limit_usd)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (name) DO UPDATE SET 
             description = EXCLUDED.description,
             status = EXCLUDED.status,
             tier = EXCLUDED.tier,
             parent_agent_id = EXCLUDED.parent_agent_id,
             monthly_cost_usd = EXCLUDED.monthly_cost_usd,
             budget_limit_usd = EXCLUDED.budget_limit_usd
           RETURNING id`,
          [child.name, child.description, child.status, child.tier, parentId, child.monthly_cost_usd, child.budget_limit_usd]
        )
        parentAgentIds[child.name] = result.rows[0].id
        results.agents++
      } catch (error) {
        results.errors.push(`Child agent ${child.name}: ${error}`)
      }
    }

    // 3. Seed approvals
    for (const approval of SAMPLE_APPROVALS) {
      try {
        const agentId = parentAgentIds[approval.agentName]
        if (!agentId) continue
        
        await query(
          `INSERT INTO approvals (agent_id, request_type, request_details, status, requested_by_user_id, assigned_to_user_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [agentId, approval.request_type, approval.request_details, approval.status, 1, 1]
        )
        results.approvals++
      } catch (error) {
        results.errors.push(`Approval for ${approval.agentName}: ${error}`)
      }
    }

    // 4. Seed activities to DynamoDB
    for (const activity of SAMPLE_ACTIVITIES) {
      try {
        await recordActivity(activity)
        results.activities++
      } catch (error) {
        results.errors.push(`Activity: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      seeded: results,
      message: `Seeded ${results.agents} agents, ${results.approvals} approvals, ${results.activities} activities`,
    })
  } catch (error) {
    console.error('[v0] Seed all error:', error)
    return NextResponse.json({ error: 'Failed to seed data', details: String(error) }, { status: 500 })
  }
}
