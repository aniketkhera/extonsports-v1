import { NextResponse } from 'next/server'
import type { CookieSpec } from './session'
import { clearedCookie } from './session'
import { sameOriginProblem } from './guard'

// Response helpers for app/api/my-bookings/*, 2026-10-20. Here and not in the route files
// because a Next route module may export only route fields (owner's house rule).
//
// no-store on every answer: each is one person's, and several set or clear the device
// cookie. next.config.ts sets the same header for the whole path as a second layer.

const NO_STORE = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

/** 403 unless the call came from this site's own page (lib/my-bookings/guard.ts). */
export function refuseCrossSite(req: Request): NextResponse | null {
  return sameOriginProblem(req) ? json({ error: 'forbidden' }, 403) : null
}

export function setCookie(res: NextResponse, c: CookieSpec): NextResponse {
  res.cookies.set({ name: c.name, value: c.value, ...c.options })
  return res
}

export function clearCookie(res: NextResponse, name: string): NextResponse {
  const c = clearedCookie(name)
  res.cookies.set({ name: c.name, value: c.value, ...c.options })
  return res
}
