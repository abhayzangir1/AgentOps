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
    console.log('[v0] Starting activity seed...')
    const results = []
    for (let i = 0; i < DEMO_ACTIVITIES.length; i++) {
      const activity = DEMO_ACTIVITIES[i]
      console.log(`[v0] Seeding activity ${i + 1}/${DEMO_ACTIVITIES.length}: ${activity.description.substring(0, 50)}...`)
      try {
        const result = await recordActivity(activity)
        results.push(result)
        console.log(`[v0] ✓ Activity ${i + 1} seeded with eventId: ${result.eventId}`)
      } catch (itemError) {
        console.error(`[v0] ✗ Activity ${i + 1} failed:`, itemError instanceof Error ? itemError.message : itemError)
        throw itemError
      }
    }
    console.log(`[v0] ✓ Successfully seeded ${results.length} activities`)
    return NextResponse.json({ success: true, seeded: results.length })
  } catch (error) {
    console.error('[v0] Seed activity error:', error instanceof Error ? error.message : error)
    console.error('[v0] Error details:', error instanceof Error ? error.stack : error)
    return NextResponse.json({ error: 'Failed to seed activity data', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
