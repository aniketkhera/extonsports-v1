import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite } from '@/lib/my-bookings/http'
import { packBook, type PackBookInput } from '@/lib/my-bookings/platform'
import { DEVICE_COOKIE, PACK_SEL_COOKIE, REQUEST_KEY_RE, type PackSelection } from '@/lib/my-bookings/session'
import { readDeviceToken, readPackSelection } from '@/lib/my-bookings/session-server'
import { isBookSuccess, phoneOf } from '@/lib/my-bookings/view'

// POST /api/my-bookings/pack/book {sel, requestKey, agreeTerms, termsVersion, expectCredits,
// phone?} — "Book · use N credits" on /my-bookings/pack, 2026-10-21 (owner, 2026-10-20:
// "let's go with the implentation.."; orangish-app docs/court-packs.md §6.2, §8.1).
//
// This site decides NOTHING about the credit. The platform re-checks the slot, chooses the
// pack, and creates the courts AND spends the credit in one transaction
// (cp_book_with_pack), keyed by requestKey so a second press or a retry books once. This
// route relays its answer as one of a closed set (lib/my-bookings/view.ts toBooked), and a
// timeout is 'unknown' — "Reload My bookings in a minute to check" — never "try again".
//
// ⛔ WHO is the device cookie, never the body; WHAT is the parked slot cookie, never the
// body. The body's `sel` is only an echo of the slot the page SHOWED, and it must equal the
// parked one or the answer is 'changed' and nothing is sent: otherwise a second tab that
// re-parked a different slot (same credits, another day) would have this tab's Book
// button spend the credit on a time the guest never saw on this screen.
//
// Guards in the order every route here uses (design §8): same-origin → 4 KB JSON body →
// per-IP limit, then the shape checks, and only then the platform. Refusals this route can
// make itself (box not ticked, a phone that is not one, no slot, signed out) cost no call.
//
// Cookies after the answer: booked or already → the slot is cleared (S1; design §8.1), so a
// reload says "Pick a time first" instead of offering to book it again. 'unknown' clears it
// too (2026-10-21, beyond §8.1, failing closed): the credit may already be spent, and a
// reload would otherwise mint a NEW request key and let a second press book the same slot
// twice; the guest checks My bookings, and re-picks the time if nothing landed.
// signed_out → the device cookie is cleared, as the cancel route does. Anything else —
// a refusal, or the platform's explicit "nothing was booked" — keeps both, so the guest can
// still press "Pay by card" for the same slot.
//
// Every known outcome is 200 {status, …}; this route's own refusals are 400/403/429, which
// the page reads as "nothing changed" (view.ts fromSiteBook).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// packBook waits up to 25 s on the platform (it holds the club's booking lock); S1 asked
// for at least 30 so the platform's answer, not this function's limit, ends the wait.
export const maxDuration = 30

/** The page's echo of the slot it showed, against the parked slot. Strict, key by key. */
function sameSlot(parked: PackSelection, shown: unknown): boolean {
  if (!shown || typeof shown !== 'object' || Array.isArray(shown)) return false
  const s = shown as Record<string, unknown>
  return s.sportId === parked.sportId && s.date === parked.date && s.startTime === parked.startTime
    && s.hours === parked.hours && s.courts === parked.courts && (s.preferCourtId ?? null) === parked.preferCourtId
}

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  // 10 presses per 10 minutes: a guest presses once (the button disables itself) and
  // perhaps retries after a "try again". Best effort, per instance (guard.ts); the durable
  // limits are the platform's, per session, IP and holder (design §6.2).
  const ip = clientIp(req)
  if (hit(`pack-book:${ip}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  // Malformed means our own page did not send it: 400, which it reads as "try again".
  const requestKey = typeof body.requestKey === 'string' ? body.requestKey : ''
  const termsVersion = typeof body.termsVersion === 'string' ? body.termsVersion : ''
  const expectCredits = body.expectCredits
  if (!REQUEST_KEY_RE.test(requestKey) || termsVersion.length < 1 || termsVersion.length > 40
    || typeof expectCredits !== 'number' || !Number.isInteger(expectCredits) || expectCredits < 1 || expectCredits > 20) {
    return json({ error: 'bad_request' }, 400)
  }
  const phoneRaw = body.phone === undefined || body.phone === null ? '' : body.phone
  if (typeof phoneRaw !== 'string') return json({ error: 'bad_request' }, 400)

  // The platform refuses these too; saying so here saves the guest a round trip.
  if (body.agreeTerms !== true) return json({ status: 'terms_required' })
  const phone = phoneRaw.trim()
  if (phone && !phoneOf(phone)) return json({ status: 'bad_phone' })

  const token = await readDeviceToken()
  if (!token) return json({ status: 'signed_out' })
  const sel = await readPackSelection()
  if (!sel || !sameSlot(sel, body.sel)) return json({ status: 'changed' })

  const input: PackBookInput = { sel, requestKey, agreeTerms: true, termsVersion, expectCredits, phone: phone || null }
  const view = await packBook(input, token, ip)
  const res = json(view)
  if (isBookSuccess(view) || view.status === 'unknown') return clearCookie(res, PACK_SEL_COOKIE)
  // The platform no longer knows this device; stop presenting the cookie.
  if (view.status === 'signed_out') return clearCookie(res, DEVICE_COOKIE)
  return res
}
