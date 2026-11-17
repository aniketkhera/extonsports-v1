import { clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite } from '@/lib/my-bookings/http'
import { requestAcademyLink } from '@/lib/academies/platform'

// POST /api/academies/request — "Email me a link" on /academies, 2026-11-16 (orangish-app
// docs/academy-page.md D1, §3.3). app/api/my-bookings/request/route.ts, for the academy scope.
//
// ⛔ The page says the same sentence whatever happens upstream (lib/academies/copy.ts
// ACADEMY_COPY.sent). The platform emails ONLY an allow-listed partner address (D2) and
// answers 202 identically for a decoy, so waiting for it here leaks nothing and lets the page
// say honestly when the platform is down. 404 is the page switched off at the club (D3) — the
// same for every address.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  // Honeypot: a bot that fills every field is told what a person is told, and nothing is sent.
  if (typeof body.company === 'string' && body.company.trim() !== '') return json({ ok: true })

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isEmailShape(email)) return json({ error: 'bad_email' }, 400)

  // Best effort, per instance (guard.ts); the durable limits are the platform's (§3.2:
  // 20/h per forwarded IP, keys prefixed ac-). Its own key, so a partner's sign-in and a
  // guest's My-bookings sign-in never share one budget.
  const ip = clientIp(req)
  if (hit(`ac-req:${ip}`, 5, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const r = await requestAcademyLink(email, ip)
  if (r === 'ok') return json({ ok: true })
  if (r === 'bad_email') return json({ error: 'bad_email' }, 400)
  if (r === 'off') return json({ error: 'not_available' }, 404)
  return json({ error: 'try_again' }, 503)
}
