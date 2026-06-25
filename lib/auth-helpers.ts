import { headers } from 'next/headers'
import { getSession } from './auth'
import { query } from './db'

/**
 * Get the current user's session. Throws 401 if not authenticated.
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session?.userId) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

/**
 * Enforce ownership scoping: verify the agent belongs to the current user.
 * Returns the agent ID if valid, or throws 403 FORBIDDEN.
 */
export async function requireAgentOwnership(agentId: number, userId: number) {
  const result = await query(`SELECT id FROM agents WHERE id = $1 AND owner_user_id = $2`, [agentId, userId])

  if (result.rows.length === 0) {
    throw new Error('FORBIDDEN')
  }

  return agentId
}

/**
 * Enforce approval ownership: verify the approval belongs to the current user's agents.
 */
export async function requireApprovalOwnership(approvalId: number, userId: number) {
  const result = await query(
    `SELECT a.id FROM approvals a
     JOIN agents ag ON a.agent_id = ag.id
     WHERE a.id = $1 AND ag.owner_user_id = $2`,
    [approvalId, userId],
  )

  if (result.rows.length === 0) {
    throw new Error('FORBIDDEN')
  }

  return approvalId
}

/**
 * Scope a query to only the user's own agents.
 * Usage: SELECT * FROM agents WHERE owner_user_id = $1 AND ...
 */
export function userOwnedAgentFilter(userId: number) {
  return `owner_user_id = ${userId}`
}
