// A coupon code on the court pack buy page, 2026-10-29. Pure — node:test loads it as is, and
// the buy form (a "use client" file) imports it, so it must never import ./platform.
//
// Aniket, 2026-10-29, on /court-packs: "on this, let's add a textbox that accepts a COUPON
// CODE." The code and its date changed twice before anything shipped — "actually, change the
// coupon code to DIWALI2026 - and change the expiration date to Sun Nov 8th midnight." and
// then "make the discount 5% pls.." — which is the reason nothing about a coupon is written
// down on this site: no code, no percent, no end date. They are rows of the platform's
// court_pack_coupons (orangish-app supabase/migrate_court_pack_coupons.sql), and a new code,
// a new percent or a code switched off needs no deploy here.
//
// ⛔ THE SITE PRICES NOTHING. The coupon price on the page is the PLATFORM's answer to
// POST /api/public/court-packs/quote (one row per active offer, in whole cents); the
// checkout sends the CODE, never a price, and the platform prices the sale again from its
// own rows under its lock (cp_create_pending). This file only reads the code a guest typed
// and lays the quote's prices beside the offers the page already shows.

import type { CouponQuoteView, OfferView } from './view'

/**
 * A coupon code as the platform's CHECK holds it (court_pack_coupons.code ~ '^[A-Z0-9]{4,32}$')
 * and as orangish-app lib/court-pack-rules.ts normaliseCouponCode reads one. The SAME shape on
 * both sides, so a code the site sends is never one the platform reads differently.
 */
export const COUPON_CODE_RE = /^[A-Z0-9]{4,32}$/

export type CouponInput = { kind: 'none' } | { kind: 'ok'; code: string } | { kind: 'bad' }

/**
 * What a guest typed, read the platform's way (orangish-app normaliseCouponCode): absent,
 * null or blank after trimming is 'none' — no coupon, the sale goes on at the list price;
 * otherwise it must be ASCII letters and digits AS TYPED, and only then is it upper-cased,
 * or it is 'bad', which never leaves this site (the routes answer coupon_invalid without a
 * call). Anything that is not a string is 'bad', not 'none': a body that sends
 * {couponCode: 42} meant a coupon, and quietly charging it the list price would not be what
 * it asked for.
 *
 * ASCII first, THEN upper case — the platform's order, 2026-10-29 (site review, minor). It
 * read `trim().toUpperCase()` and then the shape, and String.prototype.toUpperCase maps
 * non-ASCII letters INTO ASCII: 'dıwalı2026' (dotless ı) → 'DIWALI2026', 'ßßßß' → 'SSSSSSSS',
 * 'ﬀﬀ' → 'FFFF'. The site took those and sent the ASCII result, which the platform took — so
 * the two sides did not read one input the same way, which is what the line above
 * COUPON_CODE_RE promises. Harmless in money (the platform prices whatever code reaches it),
 * but a parity this file claims has to be real.
 */
export function normaliseCouponCode(raw: unknown): CouponInput {
  if (raw === undefined || raw === null) return { kind: 'none' }
  if (typeof raw !== 'string') return { kind: 'bad' }
  const typed = raw.trim()
  if (typed === '') return { kind: 'none' }
  if (!/^[A-Za-z0-9]{4,32}$/.test(typed)) return { kind: 'bad' }
  const code = typed.toUpperCase()
  return COUPON_CODE_RE.test(code) ? { kind: 'ok', code } : { kind: 'bad' }
}

/**
 * ?code= on /court-packs, or null. Stripe's cancel_url brings it back (orangish-app
 * createPackCheckout adds &code=<code> beside sport and credits), and a flyer or a message may
 * carry one; the form pre-fills it and applies it once on load. One string only — a repeated
 * ?code= is ignored rather than guessed between — upper-cased, and the coupon shape or nothing.
 */
export function couponFromQuery(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const n = normaliseCouponCode(v)
  return n.kind === 'ok' ? n.code : null
}

/**
 * The field as the guest types: upper-cased on the way in (Aniket's codes are capitals).
 * ASCII a–z ONLY, 2026-10-29 (site review, minor — see normaliseCouponCode): a whole-string
 * toUpperCase would turn a typed 'ı' or 'ß' into ASCII in the field itself, before the
 * normaliser ever saw it, and the field would then accept what the platform's own reading
 * refuses. Anything else stays as typed, so the guest sees it and Apply refuses it.
 */
export function couponTyped(v: string): string {
  return v.replace(/[a-z]+/g, (s) => s.toUpperCase()).slice(0, 40)
}

/** One offer under an applied coupon: the list price struck, the coupon price, the saving. */
export type CouponPrice = {
  listPriceCents: number
  priceCents: number
  perHourCents: number // priceCents / credits — whole cents, view.ts toCouponQuote checked it
  savesCents: number // listPriceCents − priceCents, always > 0
}

/**
 * The quote's price for ONE offer on the page, or null: no coupon applied, the quote does not
 * price this sport and size, or it priced a different list price than the page shows (the
 * offers changed between the page's load and Apply — the stale page's list price and the
 * quote's coupon price would then be two different packs' numbers side by side).
 *
 * null means the offer shows its list price and Pay sends NO code for it (BuyForm.tsx), so the
 * price on the button is always the price the platform will charge.
 */
export function couponPriceFor(
  offer: Pick<OfferView, 'sportId' | 'credits' | 'priceCents'>,
  quote: Pick<CouponQuoteView, 'prices'> | null,
): CouponPrice | null {
  if (!quote) return null
  const row = quote.prices.find((p) => p.sportId === offer.sportId && p.credits === offer.credits)
  if (!row || row.listPriceCents !== offer.priceCents || row.priceCents >= row.listPriceCents) return null
  return {
    listPriceCents: row.listPriceCents,
    priceCents: row.priceCents,
    perHourCents: row.priceCents / offer.credits,
    savesCents: row.listPriceCents - row.priceCents,
  }
}

/**
 * The offer as the page should show it under the coupon: the same offer with the coupon's
 * price and per-hour in place of its own, so every sentence copy.ts already builds from an
 * offer (sizeTile, perHourLine, payButton) reads the price that will be charged. No coupon
 * for it → the offer itself, unchanged.
 */
export function pricedOffer<T extends Pick<OfferView, 'sportId' | 'credits' | 'priceCents' | 'perHourCents'>>(
  offer: T,
  quote: Pick<CouponQuoteView, 'prices'> | null,
): { offer: T; coupon: CouponPrice | null } {
  const coupon = couponPriceFor(offer, quote)
  return coupon
    ? { offer: { ...offer, priceCents: coupon.priceCents, perHourCents: coupon.perHourCents }, coupon }
    : { offer, coupon: null }
}

/** Whether a quote prices at least one offer on the page — else applying it would show a
 *  "5% off" that takes nothing off anything here. */
export function couponCoversAny(
  offers: Pick<OfferView, 'sportId' | 'credits' | 'priceCents'>[],
  quote: Pick<CouponQuoteView, 'prices'> | null,
): boolean {
  return offers.some((o) => couponPriceFor(o, quote) !== null)
}
