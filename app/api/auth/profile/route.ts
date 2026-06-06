import { NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { query } from '@/lib/db'
import { getSession, createSession, setSessionCookie } from '@/lib/auth'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { name, email, currentPassword, newPassword } = await request.json()

    // Fetch current user
    const userResult = await query(
      `SELECT id, email, name, role, password_hash FROM users WHERE id = $1`,
      [session.userId],
    )
    const user = userResult.rows[0]
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 })
      }
      const valid = await bcryptjs.compare(currentPassword, user.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
      }
    }

    // Check email uniqueness if changing email
    const newEmail = email ? email.toLowerCase().trim() : user.email
    if (newEmail !== user.email) {
      const exists = await query(`SELECT id FROM users WHERE email = $1 AND id != $2`, [newEmail, user.id])
      if (exists.rows.length > 0) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
    }

    const newName = name ? name.trim() : user.name
    const newHash = newPassword ? await bcryptjs.hash(newPassword, 12) : user.password_hash

    await query(
      `UPDATE users SET name = $1, email = $2, password_hash = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [newName, newEmail, newHash, user.id],
    )

    // Re-issue session cookie with updated claims
    const token = await createSession({
      userId: user.id,
      email: newEmail,
      name: newName,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: newEmail, name: newName, role: user.role },
    })
    response.cookies.set(setSessionCookie(token))
    return response
  } catch (error) {
    console.error('[v0] Profile update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
