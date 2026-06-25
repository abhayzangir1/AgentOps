import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { query } from './db'

export interface AuthenticatedAgent {
  agent_id: number
  user_id: number
  agent_name: string
  api_key_id: number
}

/**
 * Validates a Bearer token (API key) from the Authorization header.
 * Returns the authenticated agent's identity or null if invalid/revoked.
 *
 * API keys follow the format: agk_<prefix>_<secret>
 * We store only the SHA-256 hash; comparing hashes prevents timing attacks.
 */
export async function validateAgentToken(req: NextRequest): Promise<AuthenticatedAgent | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  // Format: agk_<16-char-prefix>_<secret>
  if (!token.startsWith('agk_')) return null
  const parts = token.split('_')
  if (parts.length !== 3) return null

  const prefix = parts[1]
  const secret = parts[2]

  // Compute hash of the full token
  const fullToken = `agk_${prefix}_${secret}`
  const hash = createHash('sha256').update(fullToken).digest('hex')

  // Look up the key
  const result = await query(
    `SELECT 
      ak.id AS api_key_id,
      ak.agent_id,
      ak.user_id,
      ak.revoked_at,
      a.name AS agent_name
     FROM api_keys ak
     JOIN agents a ON a.id = ak.agent_id
     WHERE ak.key_prefix = $1 AND ak.key_hash = $2 AND ak.revoked_at IS NULL
     LIMIT 1`,
    [prefix, hash],
  ).catch(() => ({ rows: [] }))

  if (result.rows.length === 0) return null

  const row = result.rows[0]

  // Update last_used_at
  await query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [row.api_key_id]).catch(() => {})

  return {
    agent_id: row.agent_id,
    user_id: row.user_id,
    agent_name: row.agent_name,
    api_key_id: row.api_key_id,
  }
}

/**
 * Generate a new API key for an agent.
 * Returns the full key (shown once to the user) and metadata for storage.
 */
export function generateApiKey(): {
  fullKey: string
  prefix: string
  hash: string
} {
  const prefix = Math.random().toString(36).slice(2, 18) // 16 chars
  const secret = Math.random().toString(36).slice(2, 32) // 30 chars (random)
  const fullKey = `agk_${prefix}_${secret}`
  const hash = createHash('sha256').update(fullKey).digest('hex')

  return { fullKey, prefix, hash }
}
