import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcryptjs from 'bcryptjs'

export async function POST() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)

    // Seed the demo operations account
    const demoPassword = 'AgentOps2024!'
    const hash = await bcryptjs.hash(demoPassword, 12)

    await query(`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
    `, ['ops@company.ai', 'Operations', hash])

    // Update permissions to reference real user id
    const userResult = await query(`SELECT id FROM users WHERE email = 'ops@company.ai'`)
    const userId = userResult.rows[0]?.id
    if (userId) {
      const agents = await query(`SELECT id FROM agents`)
      for (const agent of agents.rows) {
        await query(`
          INSERT INTO permissions (user_id, agent_id, permission_level)
          VALUES ($1, $2, 'admin')
          ON CONFLICT (user_id, agent_id) DO NOTHING
        `, [userId, agent.id])
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auth migration completed',
      demo: {
        email: 'ops@company.ai',
        password: 'AgentOps2024!',
        role: 'admin',
      },
    })
  } catch (error) {
    console.error('[v0] Auth migrate error:', error)
    return NextResponse.json(
      { error: 'Auth migration failed', details: String(error) },
      { status: 500 },
    )
  }
}
