import { NextResponse } from 'next/server'
import { clearedCookie, linkCookie, LINK_COOKIE, TOKEN_RE } from '@/lib/my-bookings/session'

// GET /my-bookings/link?t=<43> — where the "Manage my bookings" button in the email lands,
// 2026-10-20. The platform builds this URL (orangish-app lib/guest-access-rules.ts
// linkUrlFor); nothing on this site does.
//
// ⛔ THIS GET SPENDS NOTHING AND CALLS NOBODY. Mail scanners fetch every link before the
// person does; if this redeemed the single-use token, the guest's own tap would find it
// spent. It only parks the token in a first-party, httpOnly cookie and 303s to
// /my-bookings/open, whose button POSTs the spend (app/api/my-bookings/open).
//
// Also why the token is in the QUERY and not a #fragment: mail clients mangle fragments,
// and the redirect drops it from the address bar either way, so it never sits on a
// rendered page's URL (or in its Referer — no-referrer below and in next.config.ts).
// Cost, accepted in the design: it appears in Vercel's request log. It is single-use,
// lives 30 minutes, and the platform stores only its hash.
//
// No page.tsx in this segment: a route and a page cannot share one (Next 16).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') ?? ''
  const res = NextResponse.redirect(new URL('/my-bookings/open', req.url), 303)
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  // A malformed token (a mail client that wrapped the URL, say) clears any older parked
  // link, so /open says "expired" rather than quietly spending a different link.
  const c = TOKEN_RE.test(t) ? linkCookie(t) : clearedCookie(LINK_COOKIE)
  res.cookies.set({ name: c.name, value: c.value, ...c.options })
  return res
}
