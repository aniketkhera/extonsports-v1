import { NextResponse } from 'next/server'
import { clearCookie, setCookie } from '@/lib/my-bookings/http'
import { PACK_SEL_COOKIE, packSelCookie, parsePackSelection } from '@/lib/my-bookings/session'

// GET /my-bookings/pack/start?s&d&t&h&n&c — where the app's booking form sends a guest who
// pressed "Continue with my court pack" ("…my 5-pack" until 2026-10-22), 2026-10-21 (owner, 2026-10-20: "let's go with the
// implentation.."; orangish-app docs/court-packs.md §8.1).
//
// WHY A ROUTE AND NOT THE PAGE: the slot has to be parked in a cookie, and a page cannot
// set one in Next 16 (cookies.md: only a Route Handler or a Server Function writes). So
// this parks it and 303s to /my-bookings/pack, which reads it.
//
// WHY PARK IT AT ALL, rather than keep it in the query string: the pack page may sign the
// guest in first, by code (a reload) or by the emailed link (/my-bookings/link → /open,
// which then sends them back to the pack page). The slot must survive that, and must never
// ride in an email. And why on THIS site: the remembered device is this site's host-only
// cookie, which the app cannot read (§0).
//
// ⛔ THE SLOT ONLY. parsePackSelection reads s, d, t, h, n and c by name and ignores every
// other parameter, so an `email=` (or anything else) on the link can never land in the
// cookie; and the redirect is to the bare page, so nothing from the query string is
// carried on in the address bar either. The platform re-checks the slot on every quote
// and book; these shape checks only keep junk out.
//
// A link that fails the checks CLEARS any slot parked earlier, and still lands on the
// page, which then says "Pick a time first". Otherwise a guest arriving from a mangled
// link would be offered the slot from their last visit and could book a time they did not
// just pick. (Same rule as /my-bookings/link: a malformed token clears the parked one.)
//
// Calls nobody, spends nothing — so no per-IP limit here. A third-party page could send a
// visitor here with a slot of its choosing; the pack page shows that slot in full and
// nothing is booked until the guest ticks the terms and presses Book on this site.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sel = parsePackSelection(new URL(req.url).searchParams)
  const res = NextResponse.redirect(new URL('/my-bookings/pack', req.url), 303)
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  if (!sel) return clearCookie(res, PACK_SEL_COOKIE)
  try {
    return setCookie(res, packSelCookie(sel))
  } catch {
    // packSelCookie throws only on a selection that would not parse back, which
    // parsePackSelection's own output never is. No slot beats a slot the page can't read.
    return clearCookie(res, PACK_SEL_COOKIE)
  }
}
