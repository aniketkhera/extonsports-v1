import { NextRequest, NextResponse } from 'next/server'
import { buildClearSessionCookie } from '../../../../lib/auth'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303)
  res.headers.set('Set-Cookie', buildClearSessionCookie())
  return res
}
