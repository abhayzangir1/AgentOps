import { NextRequest, NextResponse } from 'next/server'
import { recordActivity, getRecentActivity, getActivityByAgent } from '@/lib/dynamodb'
import { ActivityEvent } from '@/lib/dynamodb'
import { getSession } from '@/lib/auth'
import { requireAgentOwnership } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let activities: ActivityEvent[]

    if (agentId) {
      // Enforce ownership: user can only see activity for their own agents
      await requireAgentOwnership(parseInt(agentId), session.userId).catch(() => {
        throw new Error('FORBIDDEN')
      })
      activities = await getActivityByAgent(parseInt(agentId), limit)
    } else {
      // Return activity for all user's agents only
      activities = await getRecentActivity(limit)
    }

    return NextResponse.json(activities)
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[v0] GET /api/activity error:', error)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Use /api/v1/activity with API key' }, { status: 403 })
}
