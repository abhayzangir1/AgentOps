import { NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { query } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [
      email.toLowerCase().trim(),
    ])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hash = await bcryptjs.hash(password, 12)
    const result = await query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, 'viewer')
       RETURNING id, email, name, role`,
      [email.toLowerCase().trim(), name.trim(), hash],
    )
    const user = result.rows[0]

    // Grant view permission on all agents for new users
    const agents = await query(`SELECT id FROM agents`)
    for (const agent of agents.rows) {
      await query(
        `INSERT INTO permissions (user_id, agent_id, permission_level)
         VALUES ($1, $2, 'view')
         ON CONFLICT (user_id, agent_id) DO NOTHING`,
        [user.id, agent.id],
      )
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
    const cookie = setSessionCookie(token)
    response.cookies.set(cookie)
    return response
  } catch (error) {
    console.error('[v0] Signup error:', error)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
