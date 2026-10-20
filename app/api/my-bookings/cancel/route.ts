import { UUID_RE, clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite } from '@/lib/my-bookings/http'
import { cancelBooking } from '@/lib/my-bookings/platform'
import { DEVICE_COOKIE } from '@/lib/my-bookings/session'
import { readDeviceToken } from '@/lib/my-bookings/session-server'

// POST /api/my-bookings/cancel {seriesId} — cancel one booking and refund it in full,
// 2026-10-20 (owner, 2026-10-18: "let's build the cancel path", "im ok with refund for now").
//
// This site decides NOTHING about the money. The platform checks the 24-hour cutoff, that
// the series is this session's, reads the PaymentIntent, claims the series, refunds via
// Stripe and only then releases the courts — failing closed at each step
// (orangish-app lib/guest-cancel.ts). This route relays its answer as one of a closed set
// (lib/my-bookings/view.ts toCancelView), and a timeout is 'unknown', never "try again".
//
// ⛔ THE TOKEN COMES FROM THE COOKIE, NEVER THE BODY. The body names a series; who is
// asking is only ever what this browser's httpOnly cookie says.
//
// Every known outcome is 200 {status, …}: the HTTP status is about this route, the
// `status` field about the booking, and the row renders it either way.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// The platform's own call is cut at 55 s (lib/my-bookings/platform.ts cancelBooking).
export const maxDuration = 60

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  const token = await readDeviceToken()
  if (!token) return json({ status: 'signed_out' })

  const seriesId = typeof body.seriesId === 'string' ? body.seriesId : ''
  if (!UUID_RE.test(seriesId)) return json({ error: 'bad_request' }, 400)

  if (hit(`cancel:${clientIp(req)}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const view = await cancelBooking(token, seriesId)
  const res = json(view)
  // The platform no longer knows this device; stop presenting the cookie.
  return view.status === 'signed_out' ? clearCookie(res, DEVICE_COOKIE) : res
}
