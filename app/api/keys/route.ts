import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/keys — list current user's API keys (never exposes the secret)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await query(
      `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.userId],
    )
    return NextResponse.json({ keys: result.rows })
  } catch (error) {
    console.error('[v0] Keys GET error:', error)
    return NextResponse.json({ error: 'Failed to load API keys' }, { status: 500 })
  }
}

// POST /api/keys — create a new API key. The full key is returned exactly once.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json({ error: 'Key name is required (max 100 chars)' }, { status: 400 })
    }

    // Cap active keys per user to prevent abuse
    const countRes = await query(
      `SELECT COUNT(*)::int AS n FROM api_keys WHERE user_id = $1 AND revoked_at IS NULL`,
      [session.userId],
    )
    if (countRes.rows[0].n >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 active keys reached. Revoke an unused key first.' }, { status: 409 })
    }

    const secret = `agk_${randomBytes(24).toString('base64url')}`
    const keyHash = createHash('sha256').update(secret).digest('hex')
    const keyPrefix = secret.slice(0, 10)

    const result = await query(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key_prefix, created_at`,
      [session.userId, name.trim(), keyPrefix, keyHash],
    )

    // The only time the plaintext key is ever returned
    return NextResponse.json({ key: result.rows[0], secret }, { status: 201 })
  } catch (error) {
    console.error('[v0] Keys POST error:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
