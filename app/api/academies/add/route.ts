import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite } from '@/lib/my-bookings/http'
import { academyAdd } from '@/lib/academies/platform'
import { ACADEMY_COOKIE } from '@/lib/academies/session'
import { readAcademyToken } from '@/lib/academies/session-server'
import type { AddBody } from '@/lib/academies/pick'

// POST /api/academies/add — THE ONE WRITE on /academies, 2026-11-16 (orangish-app
// docs/academy-page.md D4, §3.3 POST /add): "Extend court 1" and "Book court 2" both come here,
// as kind 'extend' or 'book'. It puts time on the partner's ACCOUNT — no card, ever (D7).
//
// This site decides NOTHING about the time or the money. The platform re-checks the window,
// the walls, the daily cap and every court inside its own lock, computes every amount, and
// sends the email (D5, D7, D10). This route only relays §3.3's seven keys — the body is
// rebuilt key by key here and again in lib/academies/platform.ts, so no price, name, title,
// hirer or partner ever rides along — and answers the platform's outcome as one of a closed
// set (lib/academies/view.ts toAddView).
//
// ⛔ WHO IS THE COOKIE, NEVER THE BODY. The partner is whatever the platform's session says
// (§3.2: session.profileId → the allow-list); the body names courts and a time only.
//
// requestId is minted by the page per press (crypto.randomUUID) and reused on a retry after a
// doubt ('unknown', 'slow_down'), so a second press replays the first answer instead of adding
// the time twice — the platform is idempotent on it.
//
// Guards in the order every route here uses: same-origin → 4 KB JSON body → per-IP limit,
// then the shape checks, and only then the platform. Every known outcome is 200 {status, …};
// this route's own refusals are 400/403/429 (lib/academies/view.ts fromSiteAdd).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// The platform's call is cut at 25 s (lib/academies/platform.ts academyAdd); a timeout there is
// 'unknown', and this function must outlive it to say so.
export const maxDuration = 30

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  // 20 presses per 10 minutes, the platform's own number per session (§3.2). A partner
  // presses once (the button disables itself) and perhaps retries after a doubt.
  const ip = clientIp(req)
  if (hit(`ac-add:${ip}`, 20, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const kind = body.kind === 'extend' || body.kind === 'book' ? body.kind : null
  const courtIds = Array.isArray(body.courtIds) && body.courtIds.every((c) => typeof c === 'string') ? (body.courtIds as string[]) : null
  const use = body.use === undefined || body.use === null ? undefined : body.use === 'coaching' || body.use === 'open_play' ? body.use : null
  if (!kind || !courtIds || use === null || typeof body.requestId !== 'string' || typeof body.date !== 'string'
    || typeof body.start !== 'string' || typeof body.minutes !== 'number') {
    return json({ error: 'bad_request' }, 400)
  }
  const add: AddBody = { requestId: body.requestId, kind, date: body.date, start: body.start, minutes: body.minutes, courtIds }
  if (use) add.use = use

  const token = await readAcademyToken()
  if (!token) return json({ status: 'signed_out' })

  const view = await academyAdd(add, token, ip)
  const res = json(view)
  // The platform no longer knows this phone; stop presenting the cookie.
  return view.status === 'signed_out' ? clearCookie(res, ACADEMY_COOKIE) : res
}
