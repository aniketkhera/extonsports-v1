import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite } from '@/lib/my-bookings/http'
import { packCouponQuote } from '@/lib/my-bookings/platform'
import { normaliseCouponCode } from '@/lib/my-bookings/coupon'

// POST /api/court-packs/quote {code} — what each court pack costs under a coupon code,
// 2026-10-29. Aniket, on /court-packs: "let's add a textbox that accepts a COUPON CODE",
// then "change the coupon code to DIWALI2026 - and change the expiration date to Sun Nov 8th
// midnight.", then "make the discount 5% pls..". The form's Apply button calls this; so does
// the form once on load when the page arrived with ?code= (Stripe's cancel_url brings it
// back). It mirrors ./../checkout/route.ts: the same guards in the same order, the same
// answer shapes.
//
// This site decides NOTHING about the coupon or the money. It knows no code, no percent and
// no end date (lib/my-bookings/coupon.ts says why); the platform finds the code, checks it is
// on, started and not expired, and prices every offer under it from its own rows
// (cp_coupon_quote). Checkout prices the sale again under its lock, so a price shown here
// can never be the one charged unless the platform agrees at Pay.
//
// The guards in the house order (design §8): refuseCrossSite → readJsonBody (4 KB) → the
// per-IP limit → only then the shape check and the platform. 10 per 10 minutes per IP — a
// guest types a code a few times at most, and a script trying codes is held here before it
// spends the platform's own per-IP budget for everyone behind this site's egress IP.
//
// ⛔ ONE REFUSAL FOR EVERY CODE IT WILL NOT TAKE: coupon_invalid — unknown, switched off, not
// started, expired, or not even the coupon shape (which never leaves this site). The platform
// answers them alike, so does this, and so does the form ("That code isn't valid or has
// expired."), so nobody learns which codes exist by trying.
//
// Answers: 200 {code, percentOff, validUntil, prices:[{sportId, credits, listPriceCents,
// priceCents}]} | 200 {error: coupon_invalid | off | slow_down | try_again} for every platform
// outcome; 400 {error} for this route's own refusals (nothing sent); 403 cross-site; 429
// slow_down.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// packCouponQuote waits up to 10 s.
export const maxDuration = 15

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  const ip = clientIp(req)
  if (hit(`coupon:${ip}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  // Blank is not a coupon to check: the form never sends one, and "not valid" is the honest
  // answer to a request that names none.
  const code = normaliseCouponCode(body.code)
  if (code.kind !== 'ok') return json({ error: 'coupon_invalid' }, 400)

  const r = await packCouponQuote(code.code, ip)
  return r.ok ? json(r.view) : json({ error: r.error })
}
