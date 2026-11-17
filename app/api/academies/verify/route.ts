import { CODE_RE, clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite, setCookie } from '@/lib/my-bookings/http'
import { academySignOut, redeemAcademy } from '@/lib/academies/platform'
import { academyCookie, replacedToken } from '@/lib/academies/session'
import { readAcademyToken } from '@/lib/academies/session-server'
import { academyRedeemRefusal } from '@/lib/academies/view'

// POST /api/academies/verify — the 6-digit code, for a partner who asked on one phone and
// reads the email on another, 2026-11-16 (app/api/my-bookings/verify/route.ts, academy scope).
//
// Every refusal is the platform's one 400 'invalid' (wrong, expired, used up, or an address
// that was never sent anything); its 429 is "too many tries" here too, never "that code didn't
// work". A successful sign-in revokes the academy token it replaces on this phone, as /open
// does (lib/my-bookings/session.ts replacedToken says why).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!CODE_RE.test(code) || !isEmailShape(email)) return json({ error: 'invalid' }, 400)

  const ip = clientIp(req)
  if (hit(`ac-verify:${ip}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const previous = await readAcademyToken()
  const r = await redeemAcademy({ email, code }, ip)
  if (!r.ok) {
    const no = academyRedeemRefusal(r.error)
    return json(no.body, no.status)
  }

  let cookie
  try {
    cookie = academyCookie(r.deviceToken, r.expiresAt)
  } catch {
    return json({ error: 'try_again' }, 503)
  }
  const stale = replacedToken(previous, r.deviceToken)
  if (stale) await academySignOut(stale, ip)
  return setCookie(json({ ok: true }), cookie)
}
