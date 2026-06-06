import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'agentops-default-secret-change-in-prod-32chars',
)
const COOKIE_NAME = 'agentops_session'
const EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  userId: number
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(SECRET)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

export function setSessionCookie(token: string): {
  name: string
  value: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax'
  path: string
  maxAge: number
} {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRES_IN,
  }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME
