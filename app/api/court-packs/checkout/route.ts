import { UUID_RE, clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite } from '@/lib/my-bookings/http'
import { packCheckout } from '@/lib/my-bookings/platform'

// POST /api/court-packs/checkout {sportId, credits, email, agreeTerms, termsVersion} — start
// buying a court pack, 2026-10-21 (owner, 2026-10-20: "let's go with the implentation.." —
// orangish-app docs/court-packs.md §4 and §8.2).
//
// 2026-10-22 (Aniket): renamed from /api/5-pack/checkout with the product ("court packs"),
// and a SIZE alongside the sport — a 5-pack or a 10-pack. `credits` must be a whole number
// (1–20, the platform's own bound) or the call never leaves this site (400 bad_size); which
// sizes are on sale is the platform's to say, so a whole number it does not sell comes back
// as ITS bad_size. next.config.ts's private-headers rule moved to /api/court-packs/:path* in
// the same change.
//
// This site decides NOTHING about the money. The platform makes a pending pack priced
// from ITS offer row (never from this call), checks the club can take a card payment
// (fail closed: 409 club_not_payable), creates the Stripe Checkout and answers its URL.
// The browser then goes to Stripe; nothing is charged until the guest pays there, and the
// pack exists only once Stripe's webhook settles it. So every refusal below is "nothing
// was charged", and a timeout is too.
//
// The guards in the house order (design §8): refuseCrossSite → readJsonBody (4 KB) → the
// per-IP limit → only then the shape checks and the platform. 8 per 10 minutes per IP,
// the platform's own ga-cp-buy-ip budget, so one noisy client cannot spend it for others
// on this site's egress IP.
//
// ⛔ NO TICK, NO CALL. agreeTerms must be exactly true — the platform refuses
// terms_required itself, but a pending pack is never even started for an unticked box.
//
// ⛔ THE ONLY URL ANSWERED IS STRIPE'S. platform.ts packCheckout follows nothing but
// https://checkout.stripe.com; the form re-checks it before it navigates (BuyForm.tsx
// stripeHref). Never reveals whether the address has a pack or an account: the platform
// answers every address alike, and so does this.
//
// Answers: 200 {url} | 200 {error} for every platform outcome; 400 {error} for this
// route's own refusals (nothing sent); 403 cross-site; 429 slow_down.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// packCheckout waits up to 25 s: the platform calls Stripe inside the request.
export const maxDuration = 30

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  const ip = clientIp(req)
  if (hit(`buy:${ip}`, 8, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const sportId = typeof body.sportId === 'string' && UUID_RE.test(body.sportId) ? body.sportId : null
  if (!sportId) return json({ error: 'bad_sport' }, 400)
  const credits = typeof body.credits === 'number' && Number.isInteger(body.credits) && body.credits >= 1
    && body.credits <= 20 ? body.credits : null
  if (credits === null) return json({ error: 'bad_size' }, 400)
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isEmailShape(email)) return json({ error: 'bad_email' }, 400)
  const termsVersion = typeof body.termsVersion === 'string' && body.termsVersion.length > 0
    && body.termsVersion.length <= 40 ? body.termsVersion : null
  if (!termsVersion) return json({ error: 'bad_request' }, 400)
  if (body.agreeTerms !== true) return json({ error: 'terms_required' }, 400)

  const r = await packCheckout({ sportId, credits, email, agreeTerms: true, termsVersion }, ip)
  return r.ok ? json({ url: r.url }) : json({ error: r.error })
}
