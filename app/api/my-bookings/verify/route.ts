import { CODE_RE, clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite, setCookie } from '@/lib/my-bookings/http'
import { redeem, signOut } from '@/lib/my-bookings/platform'
import { deviceCookie, replacedToken } from '@/lib/my-bookings/session'
import { readDeviceToken } from '@/lib/my-bookings/session-server'
import { redeemRefusal } from '@/lib/my-bookings/view'

// POST /api/my-bookings/verify — the 6-digit code, for a guest who asked on one device
// and reads the email on another, 2026-10-20.
//
// Every refusal is the same 400 'invalid' (wrong, expired, exhausted, or an address that
// was never sent anything), mirroring the platform. The platform holds the real limit —
// 5 guesses per emailed code and 30 per address per day, and any live email's code works;
// this per-IP one only slows a single client down.
//
// A successful sign-in revokes the device token it replaces, as open does (second review,
// 2026-10-20; lib/my-bookings/session.ts replacedToken).

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
  if (hit(`verify:${ip}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  // The platform's 429 is "too many tries" here too, not "that code didn't work"
  // (security review, 2026-10-20): CodeForm shows COPY.tooMany for it.
  const previous = await readDeviceToken()
  const r = await redeem({ email, code }, ip)
  if (!r.ok) {
    const no = redeemRefusal(r.error)
    return json(no.body, no.status)
  }

  let cookie
  try {
    cookie = deviceCookie(r.deviceToken, r.expiresAt)
  } catch {
    return json({ error: 'try_again' }, 503)
  }
  const stale = replacedToken(previous, r.deviceToken)
  if (stale) await signOut(stale, ip)
  return setCookie(json({ ok: true }), cookie)
}
