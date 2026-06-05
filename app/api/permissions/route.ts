import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Get all permissions for a user, including inherited permissions from parent agents
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const agentId = searchParams.get('agentId')

    if (userId) {
      // Get all permissions for a user using recursive CTE
      // This resolves inherited permissions through the agent hierarchy
      const result = await query(
        `WITH RECURSIVE agent_tree AS (
          -- Base case: direct permissions
          SELECT 
            a.id as agent_id,
            a.name as agent_name,
            a.parent_agent_id,
            p.permission_level,
            p.id as permission_id,
            1 as depth,
            ARRAY[a.id] as path
          FROM agents a
          JOIN permissions p ON p.agent_id = a.id
          WHERE p.user_id = $1

          UNION ALL

          -- Recursive case: child agents inherit parent permissions
          SELECT 
            child.id as agent_id,
            child.name as agent_name,
            child.parent_agent_id,
            parent.permission_level,
            parent.permission_id,
            parent.depth + 1,
            parent.path || child.id
          FROM agents child
          JOIN agent_tree parent ON child.parent_agent_id = parent.agent_id
          WHERE NOT child.id = ANY(parent.path) -- Prevent cycles
        )
        SELECT DISTINCT ON (agent_id)
          agent_id,
          agent_name,
          permission_level,
          depth,
          CASE WHEN depth > 1 THEN true ELSE false END as inherited
        FROM agent_tree
        ORDER BY agent_id, depth ASC`,
        [parseInt(userId)],
      )

      return NextResponse.json(result.rows)
    }

    if (agentId) {
      // Get all users with permissions on this agent (direct or inherited)
      const result = await query(
        `WITH RECURSIVE parent_chain AS (
          -- Base case: the agent itself
          SELECT id, parent_agent_id, 1 as depth
          FROM agents
          WHERE id = $1

          UNION ALL

          -- Recursive case: walk up the parent chain
          SELECT a.id, a.parent_agent_id, pc.depth + 1
          FROM agents a
          JOIN parent_chain pc ON a.id = pc.parent_agent_id
          WHERE pc.depth < 10 -- Limit depth to prevent runaway
        )
        SELECT 
          p.user_id,
          p.permission_level,
          a.id as granted_on_agent_id,
          a.name as granted_on_agent_name,
          CASE WHEN a.id != $1 THEN true ELSE false END as inherited
        FROM parent_chain pc
        JOIN agents a ON a.id = pc.id
        JOIN permissions p ON p.agent_id = a.id
        ORDER BY pc.depth ASC`,
        [parseInt(agentId)],
      )

      return NextResponse.json(result.rows)
    }

    // Return all permissions with hierarchy info
    const result = await query(
      `SELECT 
        p.id,
        p.user_id,
        p.agent_id,
        p.permission_level,
        a.name as agent_name,
        a.parent_agent_id
      FROM permissions p
      JOIN agents a ON a.id = p.agent_id
      ORDER BY a.id`,
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('[v0] GET /api/permissions error:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, agent_id, permission_level } = body

    // Check if permission already exists
    const existing = await query(
      'SELECT id FROM permissions WHERE user_id = $1 AND agent_id = $2',
      [user_id, agent_id],
    )

    if (existing.rows.length > 0) {
      // Update existing permission
      const result = await query(
        `UPDATE permissions 
         SET permission_level = $1
         WHERE user_id = $2 AND agent_id = $3
         RETURNING *`,
        [permission_level, user_id, agent_id],
      )
      return NextResponse.json(result.rows[0])
    }

    // Create new permission
    const result = await query(
      `INSERT INTO permissions (user_id, agent_id, permission_level)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, agent_id, permission_level],
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST /api/permissions error:', error)
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const agentId = searchParams.get('agentId')

    if (!userId || !agentId) {
      return NextResponse.json({ error: 'userId and agentId required' }, { status: 400 })
    }

    await query(
      'DELETE FROM permissions WHERE user_id = $1 AND agent_id = $2',
      [parseInt(userId), parseInt(agentId)],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE /api/permissions error:', error)
    return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 })
  }
}
