import { NextRequest, NextResponse } from 'next/server'
import { recordActivity, getRecentActivity, getActivityByAgent } from '@/lib/dynamodb'
import { ActivityEvent } from '@/lib/dynamodb'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let activities: ActivityEvent[]

    if (agentId) {
      activities = await getActivityByAgent(parseInt(agentId), limit)
    } else {
      activities = await getRecentActivity(limit)
    }

    return NextResponse.json(activities)
  } catch (error) {
    console.error('[v0] GET /api/activity error:', error)
    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agentId,
      eventType,
      description,
      status = 'success',
      costUSD = 0,
      duration = 0,
      metadata,
    } = body

    const event = await recordActivity({
      agentId,
      eventType,
      description,
      status,
      costUSD,
      duration,
      timestamp: Date.now(),
      metadata,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/activity error:', error)
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 })
  }
}
