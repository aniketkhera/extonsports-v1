import { clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite } from '@/lib/my-bookings/http'
import { requestLink } from '@/lib/my-bookings/platform'

// POST /api/my-bookings/request — "email me a link", 2026-10-20.
//
// ⛔ The page says the same sentence whatever happens upstream (lib/my-bookings/copy.ts
// COPY.sent). The platform emails ONLY an address with an upcoming paid guest booking at
// Exton, and answers 202 identically either way, so waiting for it here leaks nothing and
// lets the page say honestly when the platform is down. Spec: orangish-app
// docs/guest-my-bookings.md §B3/§C1.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  // Honeypot (the BadmintonEnquiry.tsx pattern): a bot that fills every field is told
  // what a person is told, and nothing is sent.
  if (typeof body.company === 'string' && body.company.trim() !== '') return json({ ok: true })

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isEmailShape(email)) return json({ error: 'bad_email' }, 400)

  // Best effort, per instance; the durable limits are the platform's — per forwarded IP,
  // per email, and a club-wide cap that since 2026-10-20 counts only emails actually sent
  // (security review: counting decoys let one script stop every real guest's email).
  const ip = clientIp(req)
  if (hit(`req:${ip}`, 5, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const r = await requestLink(email, ip)
  if (r === 'ok') return json({ ok: true })
  if (r === 'bad_email') return json({ error: 'bad_email' }, 400)
  return json({ error: 'try_again' }, 503)
}
