import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite, setCookie } from '@/lib/my-bookings/http'
import { academySignOut, redeemAcademy } from '@/lib/academies/platform'
import { ACADEMY_LINK_COOKIE, academyCookie, replacedToken } from '@/lib/academies/session'
import { readAcademyLink, readAcademyToken } from '@/lib/academies/session-server'
import { academyRedeemRefusal } from '@/lib/academies/view'

// POST /api/academies/open — spend the parked email link, 2026-11-16
// (app/api/my-bookings/open/route.ts, academy scope).
//
// WHY A BUTTON AND NOT THE LINK ITSELF: mail scanners GET every link in a message before the
// person does; if that GET spent the single-use token, the partner's own tap would find it
// spent. GET /academies/link only parks it, and the spend happens here, on a same-origin POST
// that a scanner never makes.
//
// The per-IP limit runs before the platform is asked. A refusal for a limit, an outage or the
// page being switched off KEEPS the parked link; only the platform's own 'invalid' spends it
// (lib/academies/view.ts academyRedeemRefusal). The academy token this replaces on this phone
// is revoked upstream (best effort; the new sign-in stands either way).
//
// The cookie's life is the platform's expiresAt, capped at 30 days (D1;
// lib/academies/session.ts academyCookie).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused
  if (!(await readJsonBody(req))) return json({ error: 'bad_request' }, 400)

  const link = await readAcademyLink()
  if (!link) return json({ error: 'invalid' }, 400)

  const ip = clientIp(req)
  if (hit(`ac-open:${ip}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const previous = await readAcademyToken()
  const r = await redeemAcademy({ link }, ip)
  if (!r.ok) {
    const no = academyRedeemRefusal(r.error)
    const res = json(no.body, no.status)
    return no.clearLink ? clearCookie(res, ACADEMY_LINK_COOKIE) : res
  }

  let cookie
  try {
    cookie = academyCookie(r.deviceToken, r.expiresAt)
  } catch {
    return json({ error: 'try_again' }, 503)
  }
  const stale = replacedToken(previous, r.deviceToken)
  if (stale) await academySignOut(stale, ip)
  return clearCookie(setCookie(json({ ok: true }), cookie), ACADEMY_LINK_COOKIE)
}
