import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite } from '@/lib/my-bookings/http'
import { signOut } from '@/lib/my-bookings/platform'
import { DEVICE_COOKIE, LINK_COOKIE } from '@/lib/my-bookings/session'
import { readDeviceToken } from '@/lib/my-bookings/session-server'

// POST /api/my-bookings/forget — "Not you? Sign out of this device", 2026-10-20.
//
// The cookie is cleared whatever the platform says: a shared family iPad must stop
// showing someone's bookings the moment they press it. The upstream revoke is awaited
// (so the session row is dead, not merely forgotten here) but its failure is swallowed —
// an unrevoked row expires on its own, and the browser no longer holds its token.
//
// Per-IP limit (security review, 2026-10-20, alongside the one added to open): past it the
// cookie is STILL cleared, only the upstream call is skipped, so a script cannot use this
// route as an unlimited relay to the platform and a person pressing it never sees a
// refusal.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused
  if (!(await readJsonBody(req))) return json({ error: 'bad_request' }, 400)

  const token = await readDeviceToken()
  const ip = clientIp(req)
  if (token && !hit(`forget:${ip}`, 10, 10 * 60_000)) await signOut(token, ip)
  return clearCookie(clearCookie(json({ ok: true }), DEVICE_COOKIE), LINK_COOKIE)
}
