import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// POST /api/billing/verify — verify Razorpay subscription payment signature
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    }

    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json()

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })
    }

    // For subscriptions Razorpay signs: payment_id + '|' + subscription_id
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex')

    const valid = crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(razorpay_signature),
    )

    if (!valid) {
      return NextResponse.json({ verified: false, error: 'Signature mismatch' }, { status: 400 })
    }

    const session = await getSession()

    // Persist the plan upgrade on the user record (drives the agent-limit gate)
    if (session?.userId) {
      await query(
        `UPDATE users SET plan = 'growth', razorpay_subscription_id = $2, updated_at = NOW() WHERE id = $1`,
        [session.userId, razorpay_subscription_id],
      ).catch((e) => console.error('[v0] Failed to persist plan upgrade:', e))
    }

    // Record the upgrade in the immutable audit trail
    await query(
      `INSERT INTO audit_logs (agent_id, action, actor_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [
        null,
        'billing_upgraded',
        session?.userId ?? 1,
        JSON.stringify({ tier: 'growth', subscription_id: razorpay_subscription_id, payment_id: razorpay_payment_id }),
      ],
    ).catch(() => {})

    return NextResponse.json({ verified: true, subscriptionId: razorpay_subscription_id })
  } catch (error) {
    console.error('[v0] POST /api/billing/verify error:', error)
    return NextResponse.json({ error: 'Verification failed', details: String(error) }, { status: 500 })
  }
}
