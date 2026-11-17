import { NextResponse } from 'next/server'
import { ACADEMY_LINK_COOKIE, academyLinkCookie, clearedCookie, TOKEN_RE } from '@/lib/academies/session'

// GET /academies/link?t=<43> — where the "Open my academy page" button in the sign-in email
// lands, 2026-11-16. The platform builds this URL (orangish-app lib/guest-access-rules.ts
// linkUrlFor, academyLinkPath — §3.2); nothing on this site does.
//
// ⛔ THIS GET SPENDS NOTHING AND CALLS NOBODY (app/my-bookings/link/route.ts, the same rule):
// mail scanners fetch every link before the person does. It only parks the token in a
// first-party, httpOnly cookie of its own (__Host-exton_ac_link) and 303s to /academies/open,
// whose button POSTs the spend (app/api/academies/open). The redirect also drops the token
// from the address bar, and no-referrer keeps it out of any Referer.
//
// No page.tsx in this segment: a route and a page cannot share one (Next 16).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') ?? ''
  const res = NextResponse.redirect(new URL('/academies/open', req.url), 303)
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  // A malformed token clears any older parked link, so /open says "expired" rather than
  // quietly spending a different link.
  const c = TOKEN_RE.test(t) ? academyLinkCookie(t) : clearedCookie(ACADEMY_LINK_COOKIE)
  res.cookies.set({ name: c.name, value: c.value, ...c.options })
  return res
}
