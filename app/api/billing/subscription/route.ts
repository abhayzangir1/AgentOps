import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay, isRazorpayConfigured, GROWTH_PLAN_ID, PUBLIC_KEY_ID } from '@/lib/razorpay'
import { getSession } from '@/lib/auth'

export const maxDuration = 30

// POST /api/billing/subscription — create a Razorpay subscription for the Growth tier
export async function POST(req: NextRequest) {
  try {
    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: 'Billing not configured', configured: false }, { status: 503 })
    }
    if (!GROWTH_PLAN_ID) {
      return NextResponse.json({ error: 'RAZORPAY_GROWTH_PLAN_ID not set' }, { status: 503 })
    }

    const session = await getSession()
    const body = await req.json().catch(() => ({}))
    const quantity = Math.max(1, Number(body?.quantity) || 1) // agent seats

    const razorpay = getRazorpay()
    const subscription = await razorpay.subscriptions.create({
      plan_id: GROWTH_PLAN_ID,
      total_count: 12, // 12 billing cycles
      quantity,
      customer_notify: 1,
      notes: {
        platform: 'AgentOps',
        user_email: session?.email ?? 'demo@agentops.dev',
        tier: 'growth',
      },
    })

    return NextResponse.json({
      configured: true,
      subscriptionId: subscription.id,
      keyId: PUBLIC_KEY_ID,
      status: subscription.status,
    })
  } catch (error) {
    console.error('[v0] POST /api/billing/subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription', details: String(error) },
      { status: 500 },
    )
  }
}

// GET — surface billing configuration status to the client
export async function GET() {
  return NextResponse.json({
    configured: isRazorpayConfigured() && Boolean(GROWTH_PLAN_ID),
    keyId: PUBLIC_KEY_ID ?? null,
  })
}
