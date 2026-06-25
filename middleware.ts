import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!)
const COOKIE_NAME = 'agentops_session'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/signup']
// Gateway routes authenticate via Bearer tokens (API keys), not session cookies
const GATEWAY_PATHS = ['/api/v1/guard', '/api/v1/activity', '/api/v1/decision']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths, static assets, and gateway routes (they have their own auth via Bearer tokens)
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    GATEWAY_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-icon')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      maxAge: 0,
      path: '/',
      secure: true,
      sameSite: 'none',
    })
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
