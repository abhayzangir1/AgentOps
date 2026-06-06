import { NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { query } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const result = await query(
      `SELECT id, email, name, role, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase().trim()],
    )

    const user = result.rows[0]
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcryptjs.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
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
    console.error('[v0] Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
