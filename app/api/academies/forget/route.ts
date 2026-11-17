import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite } from '@/lib/my-bookings/http'
import { academySignOut } from '@/lib/academies/platform'
import { ACADEMY_COOKIE, ACADEMY_LINK_COOKIE } from '@/lib/academies/session'
import { readAcademyToken } from '@/lib/academies/session-server'

// POST /api/academies/forget — "Sign out" on /academies, 2026-11-16
// (app/api/my-bookings/forget/route.ts, academy scope).
//
// The academy cookies are cleared whatever the platform says: a phone handed to someone else
// must stop showing the partner's page — and stop being able to add on-account time — the
// moment Sign out is pressed. The upstream revoke is awaited, its failure swallowed. Past the
// per-IP limit the cookies are STILL cleared; only the upstream call is skipped. A guest
// My-bookings sign-in on the same phone is a different cookie and is left alone.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused
  if (!(await readJsonBody(req))) return json({ error: 'bad_request' }, 400)

  const token = await readAcademyToken()
  const ip = clientIp(req)
  if (token && !hit(`ac-forget:${ip}`, 10, 10 * 60_000)) await academySignOut(token, ip)
  return clearCookie(clearCookie(json({ ok: true }), ACADEMY_COOKIE), ACADEMY_LINK_COOKIE)
}
