import { CODE_RE, clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite, setCookie } from '@/lib/my-bookings/http'
import { redeem } from '@/lib/my-bookings/platform'
import { deviceCookie } from '@/lib/my-bookings/session'

// POST /api/my-bookings/verify — the 6-digit code, for a guest who asked on one device
// and reads the email on another, 2026-10-20.
//
// Every refusal is the same 400 'invalid' (wrong, expired, exhausted, or an address that
// was never sent anything), mirroring the platform. The platform holds the real limit —
// 5 attempts per challenge, 10 per 30 min per address; this per-IP one only slows a
// single client down.

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

  if (hit(`verify:${clientIp(req)}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const r = await redeem({ email, code })
  if (!r.ok) return r.error === 'invalid' ? json({ error: 'invalid' }, 400) : json({ error: 'try_again' }, 503)

  let cookie
  try {
    cookie = deviceCookie(r.deviceToken, r.expiresAt)
  } catch {
    return json({ error: 'try_again' }, 503)
  }
  return setCookie(json({ ok: true }), cookie)
}
