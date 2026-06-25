import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateApiKey } from '@/lib/agent-auth'

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

// POST /api/keys — create a new API key for an agent. The full key is returned exactly once.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, agent_id } = await req.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json({ error: 'Key name is required (max 100 chars)' }, { status: 400 })
    }
    if (!agent_id || typeof agent_id !== 'number') {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }

    // Verify the agent belongs to this user
    const agentRes = await query(
      `SELECT id FROM agents WHERE id = $1 AND owner_user_id = $2`,
      [agent_id, session.userId],
    )
    if (agentRes.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found or not owned by you' }, { status: 403 })
    }

    // Cap active keys per user to prevent abuse
    const countRes = await query(
      `SELECT COUNT(*)::int AS n FROM api_keys WHERE user_id = $1 AND revoked_at IS NULL`,
      [session.userId],
    )
    if (countRes.rows[0].n >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 active keys reached. Revoke an unused key first.' }, { status: 409 })
    }

    const { fullKey, prefix, hash } = generateApiKey()

    const result = await query(
      `INSERT INTO api_keys (user_id, agent_id, name, key_prefix, key_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key_prefix, created_at`,
      [session.userId, agent_id, name.trim(), prefix, hash],
    )

    // The only time the plaintext key is ever returned
    return NextResponse.json({ key: result.rows[0], secret: fullKey }, { status: 201 })
  } catch (error) {
    console.error('[v0] Keys POST error:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
