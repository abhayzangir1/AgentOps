import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required')
}
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)
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
  sameSite: 'none'
  path: string
  maxAge: number
} {
  // SameSite=None + Secure is required so the session cookie is accepted
  // inside the cross-origin HTTPS preview iframe (and any embedded context).
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: EXPIRES_IN,
  }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME
