import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite } from '@/lib/my-bookings/http'
import { academyDay } from '@/lib/academies/platform'
import { ACADEMY_COOKIE } from '@/lib/academies/session'
import { readAcademyToken } from '@/lib/academies/session-server'
import { ymdOf } from '@/lib/academies/view'

// POST /api/academies/day {date} — one day's court × half-hour grid for "Book more",
// 2026-11-16 (orangish-app docs/academy-page.md §3.3 GET /day).
//
// A POST from the page, relayed as the platform's GET, so it passes the same four CSRF layers
// as every route on this path (lib/my-bookings/guard.ts): a same-origin GET carries no Origin
// to check. It reads nothing but the date from the body; WHO is the httpOnly cookie, never
// the body.
//
// Every known outcome is 200 {status, …}; this route's own refusals are 400/403/429, which the
// page reads as "can't show free courts right now" (lib/academies/view.ts fromSiteDay). The
// grid is the platform's allow-listed answer (toDay): five cell states and nothing about who
// holds a taken court.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)
  const date = ymdOf(body.date)
  if (!date) return json({ error: 'bad_request' }, 400)

  // 60 a minute: a partner flicking through the fourteen day chips, twice. The platform's own
  // is 60/min per session (§3.2).
  const ip = clientIp(req)
  if (hit(`ac-day:${ip}`, 60, 60_000)) return json({ error: 'slow_down' }, 429)

  const token = await readAcademyToken()
  if (!token) return json({ status: 'signed_out' })

  const r = await academyDay(token, date, ip)
  const res = json(r)
  // The platform no longer knows this phone; stop presenting the cookie.
  return r.status === 'signed_out' ? clearCookie(res, ACADEMY_COOKIE) : res
}
