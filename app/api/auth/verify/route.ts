import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, signToken, buildSessionCookie, SESSION_TTL, isAdmin } from '../../../../lib/auth'

// GET /api/auth/verify?token=<magic-link-token>
//
// Validates the magic-link token, mints a session token, sets the
// signed-cookie session, and redirects to /admin.

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const v = verifyToken(token)

  if (!v.valid || v.payload.kind !== 'magic') {
    const reason = v.valid ? 'invalid' : v.reason
    return NextResponse.redirect(new URL(`/admin/login?error=${reason}`, req.url), 303)
  }

  // Belt + suspenders: the magic link encodes the email, but
  // re-check the allowlist in case it was rotated after the link
  // was sent.
  if (!isAdmin(v.payload.email)) {
    return NextResponse.redirect(new URL('/admin/login?error=not-allowed', req.url), 303)
  }

  const sessionToken = signToken({ email: v.payload.email, kind: 'session' }, SESSION_TTL)
  const res = NextResponse.redirect(new URL('/admin', req.url), 303)
  res.headers.set('Set-Cookie', buildSessionCookie(sessionToken))
  return res
}
