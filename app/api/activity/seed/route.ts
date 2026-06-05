import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/dynamodb'

const DEMO_ACTIVITIES = [
  {
    agentId: 1,
    eventType: 'execution' as const,
    description: 'Acme Corp AI Squad completed weekly analysis',
    status: 'success' as const,
    costUSD: 12.50,
    duration: 5400,
    timestamp: Date.now() - 300000,
    metadata: { tasksCompleted: 47 },
  },
  {
    agentId: 2,
    eventType: 'execution' as const,
    description: 'DataFlow Pipeline processed 15,847 records',
    status: 'success' as const,
    costUSD: 2.45,
    duration: 3240,
    timestamp: Date.now() - 600000,
    metadata: { recordsProcessed: 15847 },
  },
  {
    agentId: 3,
    eventType: 'deployment' as const,
    description: 'ContentGen Pro deployed v2.1.0',
    status: 'success' as const,
    costUSD: 0.78,
    duration: 1820,
    timestamp: Date.now() - 900000,
    metadata: { version: 'v2.1.0' },
  },
  {
    agentId: 4,
    eventType: 'error' as const,
    description: 'Support Bot rate limit exceeded',
    status: 'failed' as const,
    timestamp: Date.now() - 1200000,
    metadata: { requestsPerMinute: 450, limit: 400 },
  },
  {
    agentId: 5,
    eventType: 'approval' as const,
    description: 'DataFlow Ingestion resource upgrade pending',
    status: 'pending' as const,
    timestamp: Date.now() - 1500000,
    metadata: { currentTier: 'pro', requestedTier: 'enterprise' },
  },
]

export async function POST() {
  try {
    const results = []
    for (const activity of DEMO_ACTIVITIES) {
      const result = await recordActivity(activity)
      results.push(result)
    }
    return NextResponse.json({ success: true, seeded: results.length })
  } catch (error) {
    console.error('[v0] Seed activity error:', error)
    return NextResponse.json({ error: 'Failed to seed activity data' }, { status: 500 })
  }
}
