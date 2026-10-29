// What the platform's answers are allowed to become on this site, 2026-10-20. Pure.
//
// ⛔ AN ALLOW-LIST, NOT A PASS-THROUGH — the same rule as app/api/court-slots/route.ts.
// The platform's GET /api/public/guest-bookings (contract §C4, orangish-app
// docs/guest-my-bookings.md) is copied field by field, each one type-checked; anything
// else it sends — today or after it grows a field — never reaches a page. A row that
// fails a check is dropped; a top level that fails is null, which the page renders as
// "can't show your bookings right now", never as "you have none".
//
// The court pack's answers (2026-10-21, orangish-app docs/court-packs.md §4, §6.2, §7.1)
// follow the same rule, at the end of this file: pack cards, the quote, the book answer,
// the offers and the purchase. Two extra rules for them:
//   • LINKS ARE OURS. A pack's "Book a court with my pack" and a quote's "Pay by card
//     instead" are built here (lib/booking.ts) from ids this file checked; the platform's
//     bookUrl and cardUrl are never followed. The terms link is kept only on the
//     platform's own origin (appHref).
//   • ONLY `match` SHOWS A PACK. A quote whose session is not 'match' loses its packs,
//     email, choice and refusal here even if the platform sent them, so no page can say
//     whether an address holds a pack before its inbox is proved (owner, 2026-10-18).
//
// Split out of ./platform.ts so node:test can load it without fetch or env.

import { UUID_RE } from './guard'
import { appHref, bookByCardUrl, bookWithPackUrl, type BookingSlot } from '../booking'
import { COUPON_CODE_RE } from './coupon'

export type BookingStatus = 'active' | 'cancelling' | 'needs_staff' | 'cancelled'
export type BlockedReason = 'within_cutoff' | 'call_club' | null
/** How a series was paid (2026-10-21). 'card' for every row a pre-pack platform sends. */
export type PaidWith = 'card' | 'pack'
/** Who cancelled a cancelled series, when the platform says: the guest online, or the desk. */
export type CancelledBy = 'you' | 'club' | null

export type BookingView = {
  seriesId: string
  sport: string
  whenText: string
  startsAt: string
  cancelBy: string
  cancelByText: string
  courts: string[]
  amountPaidCents: number
  status: BookingStatus
  cancellable: boolean
  blockedReason: BlockedReason
  refundedCents: number | null
  // The court pack (2026-10-21). On a card row: 'card' and four nulls.
  paidWith: PaidWith
  credits: number | null // the credits this series used — pack rows only
  creditsReturned: number | null // pack rows, once cancelled
  cancelledBy: CancelledBy // cancelled rows only
  packName: string | null // "Badminton 5-pack" — pack rows only
  // "PK-3F2A9C" — WHICH pack paid (the platform's packRef, the card's own ref). Pack rows
  // only, and null when the platform sent none or one of another shape (review UI-2,
  // 2026-10-21): it only decides whether the cancel sheet may name the pack's date, so a
  // bad ref says less rather than hiding the booking.
  packRef: string | null
}

export type ListView = {
  club: { name: string; phone: string }
  email: string | null
  cutoffHours: number
  bookings: BookingView[]
  /** The guest's court packs at this club (2026-10-21), any size; [] from a platform without packs. */
  packs: PackView[]
}

export type CancelStatus =
  | 'cancelled' | 'already_cancelled' | 'processing' | 'too_late' | 'in_progress'
  | 'not_cancellable' | 'needs_staff' | 'not_found' | 'signed_out' | 'try_again' | 'unknown'

/**
 * The pack a credit went back to, as a pack cancel's answer shows it (design §7.2).
 *
 * Two keys the platform added on 2026-10-21 (orangish-app review F5 / R8,
 * lib/court-pack-cancel.ts answer()), present here ONLY when they say something, so the view
 * of an ordinary started pack is exactly what it was before them:
 *  - `closed: true` — the pack was refunded or disputed: the booking is cancelled but there
 *    is NO credit to use, and the page must never say "Credit is back" (validUntilText null);
 *  - `firstGameByText` — the pack's 60 days have not started, so its date is the day to play
 *    a first game by, not a "valid until" (validUntilText null).
 */
export type CancelPackView = {
  name: string
  creditsLeft: number
  creditsTotal: number
  validUntilText: string | null
  closed?: true
  firstGameByText?: string
}

/**
 * A cancel's outcome. The three pack keys are present ONLY on a pack series' answer, so a
 * card cancel is exactly the object it was before packs (and a pack one never carries a
 * refunded amount: no money moves).
 */
export type CancelView = {
  status: CancelStatus
  refundedCents?: number
  phone?: string
  paidWith?: 'pack'
  creditsReturned?: number
  pack?: CancelPackView
}

const STATUSES: readonly BookingStatus[] = ['active', 'cancelling', 'needs_staff', 'cancelled']
const BLOCKED: readonly Exclude<BlockedReason, null>[] = ['within_cutoff', 'call_club']

const MAX_TEXT = 200

function text(v: unknown, max = MAX_TEXT): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null
}
function cents(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10_000_000 ? v : null
}
function iso(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v)) ? v : null
}
/** A phone is printed into a sentence; only digits and phone punctuation get there. */
export function phoneOf(v: unknown): string | null {
  return typeof v === 'string' && /^[0-9+().\- ]{7,32}$/.test(v) ? v : null
}
function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}
/** A whole number of credits, lo–hi. A pack holds 1–20 (court_pack_offers.credits). */
function count(v: unknown, lo: number, hi: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null
}
/** null/undefined → null; a valid value → it; anything else → undefined (= reject). */
function optional<T>(v: unknown, check: (v: unknown) => T | null): T | null | undefined {
  if (v === null || v === undefined) return null
  const out = check(v)
  return out === null ? undefined : out
}
/** A real club-local calendar date, YYYY-MM-DD. '2026-02-30' is not one. */
function ymd(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const probe = new Date(`${v}T12:00:00Z`)
  return !Number.isNaN(probe.getTime()) && probe.toISOString().slice(0, 10) === v ? v : null
}
/** A masked address as the platform's maskEmail writes it ("a•••@gmail.com", or "•••"). An
 *  address that is NOT masked is refused: the whole of one never reaches a page. */
function masked(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 254 && /^(?:[^\s@]•••@[^\s@]+|•••)$/.test(v) ? v : null
}

function toBooking(raw: unknown): BookingView | null {
  const r = obj(raw)
  if (!r) return null
  const seriesId = typeof r.seriesId === 'string' && UUID_RE.test(r.seriesId) ? r.seriesId : null
  const sport = text(r.sport, 60)
  const whenText = text(r.whenText)
  const startsAt = iso(r.startsAt)
  const cancelBy = iso(r.cancelBy)
  const cancelByText = text(r.cancelByText, 80)
  const amountPaidCents = cents(r.amountPaidCents)
  const status = STATUSES.find((s) => s === r.status)
  if (!seriesId || !sport || !whenText || !startsAt || !cancelBy || !cancelByText
    || amountPaidCents === null || !status) return null
  if (!Array.isArray(r.courts) || r.courts.length === 0 || r.courts.length > 20) return null
  const courts = r.courts.map((c) => text(c, 60))
  if (courts.some((c) => c === null)) return null
  if (typeof r.cancellable !== 'boolean') return null
  const blockedReason = r.blockedReason === null || r.blockedReason === undefined
    ? null
    : BLOCKED.find((b) => b === r.blockedReason)
  if (blockedReason === undefined) return null
  const refundedCents = r.refundedCents === null || r.refundedCents === undefined ? null : cents(r.refundedCents)
  if (refundedCents === null && r.refundedCents !== null && r.refundedCents !== undefined) return null

  // The court pack (2026-10-21, design §7.1). A row from a platform without packs has
  // none of these keys and is a card row; a value outside the closed sets drops the row.
  const paidWith: PaidWith | null = r.paidWith === undefined || r.paidWith === null || r.paidWith === 'card'
    ? 'card'
    : r.paidWith === 'pack' ? 'pack' : null
  if (!paidWith) return null
  const cancelledBy = optional<'you' | 'club'>(r.cancelledBy, (v) => (v === 'you' || v === 'club' ? v : null))
  if (cancelledBy === undefined) return null
  let credits: number | null = null
  let packName: string | null = null
  let creditsReturned: number | null = null
  let packRef: string | null = null
  if (paidWith === 'pack') {
    credits = count(r.credits, 1, 20)
    packName = text(r.packName, 60)
    const back = optional(r.creditsReturned, (v) => count(v, 0, 20))
    if (credits === null || !packName || back === undefined) return null
    creditsReturned = back
    packRef = typeof r.packRef === 'string' && PACK_REF_RE.test(r.packRef) ? r.packRef : null
  }

  return {
    seriesId, sport, whenText, startsAt, cancelBy, cancelByText,
    courts: courts as string[],
    amountPaidCents,
    status,
    // Belt and braces: only an ACTIVE booking ever shows a Cancel button, whatever the
    // flag says. The platform re-checks everything on the POST regardless.
    cancellable: r.cancellable && status === 'active',
    blockedReason,
    // A pack series never shows money refunded: none moved (the platform sends 0).
    refundedCents: status === 'cancelled' && paidWith === 'card' ? refundedCents : null,
    paidWith,
    credits,
    creditsReturned: status === 'cancelled' ? creditsReturned : null,
    cancelledBy: status === 'cancelled' ? cancelledBy : null,
    packName,
    packRef,
  }
}

/** Usable packs first (design §8.3: "active packs first"); the platform's order otherwise. */
const PACK_ORDER: readonly PackStatus[] = ['active', 'all_booked', 'used_up', 'expired', 'refunded', 'disputed']

export function toView(json: unknown): ListView | null {
  const j = obj(json)
  if (!j) return null
  const club = obj(j.club)
  const name = club && text(club.name, 120)
  const phone = club && phoneOf(club.phone)
  if (!name || !phone) return null
  const email = j.email === null || j.email === undefined ? null : text(j.email, 254)
  if (email === null && j.email !== null && j.email !== undefined) return null
  const cutoffHours = typeof j.cutoffHours === 'number' && Number.isInteger(j.cutoffHours)
    && j.cutoffHours >= 1 && j.cutoffHours <= 168 ? j.cutoffHours : null
  if (cutoffHours === null || !Array.isArray(j.bookings)) return null
  const bookings = j.bookings
    .map(toBooking)
    .filter((b): b is BookingView => b !== null)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  // Missing (a platform without packs, or a club without the flag) is []. Present and not
  // a list is a bad answer: "you have no packs" would be a lie, like "no bookings".
  if (j.packs !== undefined && j.packs !== null && !Array.isArray(j.packs)) return null
  const packs = (Array.isArray(j.packs) ? j.packs : [])
    .map(toPack)
    .filter((p): p is PackView => p !== null)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => PACK_ORDER.indexOf(a.p.status) - PACK_ORDER.indexOf(b.p.status) || a.i - b.i)
    .map(({ p }) => p)
  return { club: { name, phone }, email, cutoffHours, bookings, packs }
}

/** A pack cancel's pack block (design §7.2), or null when it does not check out. */
function toCancelPack(raw: unknown): CancelPackView | null {
  const p = obj(raw)
  if (!p) return null
  const name = text(p.name, 60)
  const creditsTotal = count(p.creditsTotal, 1, 20)
  const creditsLeft = creditsTotal === null ? null : count(p.creditsLeft, 0, creditsTotal)
  const validUntilText = optional(p.validUntilText, (v) => text(v, 80))
  // 2026-10-21 (see CancelPackView): a boolean or absent, nothing else — a value we cannot
  // read drops the block like any bad pack field; and the date in the same shape as
  // validUntilText.
  const closed = p.closed === undefined || p.closed === null ? false : typeof p.closed === 'boolean' ? p.closed : undefined
  const firstGameByText = optional(p.firstGameByText, (v) => text(v, 80))
  if (!name || creditsTotal === null || creditsLeft === null || validUntilText === undefined
    || closed === undefined || firstGameByText === undefined) return null
  const v: CancelPackView = { name, creditsLeft, creditsTotal, validUntilText }
  if (closed) v.closed = true
  if (firstGameByText !== null) v.firstGameByText = firstGameByText
  return v
}

/** The pack keys of a cancel answer, or null for a card series. */
function packCancelOf(j: Record<string, unknown>, status: 'cancelled' | 'already_cancelled'): CancelView | null {
  if (j.paidWith !== 'pack') return null
  const v: CancelView = { status, paidWith: 'pack' }
  const back = count(j.creditsReturned, 1, 20)
  if (back !== null) v.creditsReturned = back
  const pack = toCancelPack(j.pack)
  if (pack) v.pack = pack
  return v
}

/**
 * The platform's answer to POST …/guest-bookings/{id}/cancel (contract §C5), as one of a
 * closed set. httpStatus 0 = no answer at all (timeout, network).
 *
 * ⚠️ WHEN IN DOUBT, 'unknown' — "reload in a minute to check" — NEVER 'try_again'. A
 * timeout or a 5xx other than 503 may have landed after Stripe refunded; telling the
 * guest "nothing changed, try again" would be a lie half the time. Only the platform's
 * explicit 503 try_again (refused before any money moved) earns 'try_again'.
 *
 * A pack series (2026-10-21, design §7.2) answers the same statuses with paidWith 'pack',
 * creditsReturned and the pack; those keys come through, and refundedCents does not.
 */
export function toCancelView(httpStatus: number, json: unknown): CancelView {
  const j = obj(json) ?? {}
  const s = j.status
  const phone = phoneOf(j.phone) ?? undefined
  const refunded = cents(j.refundedCents) ?? undefined
  const withPhone = (status: CancelStatus): CancelView => (phone ? { status, phone } : { status })

  if (httpStatus === 200 && (s === 'cancelled' || s === 'already_cancelled')) {
    const pack = packCancelOf(j, s)
    if (pack) return pack
    return refunded !== undefined ? { status: s, refundedCents: refunded } : { status: s }
  }
  if (httpStatus === 202 && s === 'processing') return { status: 'processing' }
  if (httpStatus === 409) {
    if (s === 'too_late' || s === 'not_cancellable' || s === 'needs_staff') return withPhone(s)
    if (s === 'in_progress') return { status: 'in_progress' }
    return { status: 'unknown' }
  }
  if (httpStatus === 404) {
    if (s === 'not_found') return { status: 'not_found' }
    // {error:'not_available'}: the club's switch is off (the kill switch). Nothing was
    // done; the honest instruction is the phone.
    if (j.error === 'not_available') return withPhone('not_cancellable')
    return { status: 'unknown' }
  }
  if (httpStatus === 401) return { status: 'signed_out' }
  // 429 is refused before anything happens; 503 is the platform's explicit "not cancelled,
  // no refund issued by this call". 400 is a malformed call that never reached the money.
  // 403 comes ONLY from the platform's relay-secret check, the first thing every endpoint
  // does (second review, 2026-10-20) — nothing was claimed or refunded.
  if (httpStatus === 429 || httpStatus === 503 || httpStatus === 400 || httpStatus === 403) {
    return { status: 'try_again' }
  }
  return { status: 'unknown' }
}

const CANCEL_STATUSES: readonly CancelStatus[] = [
  'cancelled', 'already_cancelled', 'processing', 'too_late', 'in_progress',
  'not_cancellable', 'needs_staff', 'not_found', 'signed_out', 'try_again', 'unknown',
]

/**
 * The BROWSER's reading of this site's own POST /api/my-bookings/cancel. That route
 * answers 200 {status} for every outcome it knows; a 4xx from it (403 cross-site, 400,
 * 429 slow_down) was refused before the platform was called, so nothing changed. Anything
 * else — no answer, a 5xx, a body we do not recognise — is 'unknown'.
 */
export function fromSiteCancel(httpStatus: number, json: unknown): CancelView {
  const j = obj(json) ?? {}
  if (httpStatus === 200) {
    const status = CANCEL_STATUSES.find((s) => s === j.status)
    if (!status) return { status: 'unknown' }
    if (status === 'cancelled' || status === 'already_cancelled') {
      const pack = packCancelOf(j, status)
      if (pack) return pack
    }
    const v: CancelView = { status }
    const refunded = cents(j.refundedCents)
    if (refunded !== null) v.refundedCents = refunded
    const phone = phoneOf(j.phone)
    if (phone) v.phone = phone
    return v
  }
  if (httpStatus === 400 || httpStatus === 403 || httpStatus === 429) return { status: 'try_again' }
  return { status: 'unknown' }
}

/** Only these two mean the money (or, for a pack, the credit) is on its way back. */
export function isCancelSuccess(v: CancelView): boolean {
  return v.status === 'cancelled' || v.status === 'already_cancelled'
}

/** Why a sign-in (email link or code) was refused. See ./platform.ts redeem(). */
export type RedeemRefusal = 'invalid' | 'slow_down' | 'try_again'

/**
 * What /api/my-bookings/open and /verify answer for a refused sign-in, and whether the
 * parked email link is thrown away.
 *
 * ⛔ ONLY 'invalid' SPENDS THE PARKED LINK (security review, 2026-10-20). The first pass
 * read the platform's 429 as 'invalid', so anyone who could make the platform rate-limit
 * (a script posting fake link cookies) deleted every real guest's parked link and told
 * them "this link has expired" when it never was. A limit or an outage now keeps the
 * link, and the guest can press again once it clears; the link still dies on its own
 * after 30 minutes (LINK_MAX_AGE_S, and the platform's own expiry).
 */
export function redeemRefusal(e: RedeemRefusal): {
  status: 400 | 429 | 503
  body: { error: RedeemRefusal }
  clearLink: boolean
} {
  if (e === 'invalid') return { status: 400, body: { error: 'invalid' }, clearLink: true }
  if (e === 'slow_down') return { status: 429, body: { error: 'slow_down' }, clearLink: false }
  return { status: 503, body: { error: 'try_again' }, clearLink: false }
}

/* ══ THE COURT PACK (2026-10-21) ═════════════════════════════════════════════════════
   orangish-app docs/court-packs.md. Each type below is what a page may receive; each to*
   function is the only way an answer becomes one. */

/** cp_pack_state's status, less 'pending' and 'abandoned' — no guest's pack is either
 *  (cp_holder_packs lists active packs only), so a row with one is dropped. */
export type PackStatus = 'active' | 'all_booked' | 'used_up' | 'expired' | 'refunded' | 'disputed'
/** Whose clock: 'started' (a game was played), 'provisional' (booked, not yet played),
 *  'not_started' (nothing booked). design §3. */
export type PackClock = 'started' | 'provisional' | 'not_started'
export type PackUse = 'upcoming' | 'played' | 'returned'

export type PackUseView = { whenText: string; credits: number; use: PackUse }

/** One of the guest's packs (the platform's PackJson, design §7.1) — no pack id, no
 *  PaymentIntent, no holder id. bookUrl is built HERE (lib/booking.ts bookWithPackUrl). */
export type PackView = {
  ref: string // 'PK-' + 6 characters: what the guest quotes to the desk
  sport: string
  sportId: string
  name: string // "Badminton 5-pack"
  creditsTotal: number
  creditsLeft: number
  creditsBooked: number // upcoming, not yet played
  status: PackStatus
  validUntil: string | null // YYYY-MM-DD, club-local, inclusive
  validUntilText: string | null // "Dec 17"
  clock: PackClock
  clockText: string | null // "60 days from your first game on Oct 18" / "Your 60 days start when you first play"
  unusedUntilText: string | null // "Oct 20, 2027" — the 12-month start-by date
  bookUrl: string
  uses: PackUseView[] // the last ≤10
}

const PACK_STATUSES: readonly PackStatus[] = PACK_ORDER
const PACK_CLOCKS: readonly PackClock[] = ['started', 'provisional', 'not_started']
const PACK_USES: readonly PackUse[] = ['upcoming', 'played', 'returned']
const PACK_REF_RE = /^PK-[A-Za-z0-9]{6}$/
const MAX_USES = 10

function toPackUse(raw: unknown): PackUseView | null {
  const u = obj(raw)
  if (!u) return null
  const whenText = text(u.whenText)
  const credits = count(u.credits, 1, 20)
  const use = PACK_USES.find((x) => x === u.use)
  return whenText && credits !== null && use ? { whenText, credits, use } : null
}

/** One pack card, or null. Credits must add up: left ≤ total, booked ≤ total − left. */
export function toPack(raw: unknown): PackView | null {
  const p = obj(raw)
  if (!p) return null
  const ref = typeof p.ref === 'string' && PACK_REF_RE.test(p.ref) ? p.ref : null
  const sport = text(p.sport, 60)
  const sportId = typeof p.sportId === 'string' && UUID_RE.test(p.sportId) ? p.sportId : null
  const name = text(p.name, 60)
  const creditsTotal = count(p.creditsTotal, 1, 20)
  const status = PACK_STATUSES.find((s) => s === p.status)
  const clock = PACK_CLOCKS.find((c) => c === p.clock)
  if (!ref || !sport || !sportId || !name || creditsTotal === null || !status || !clock) return null
  const creditsLeft = count(p.creditsLeft, 0, creditsTotal)
  if (creditsLeft === null) return null
  const creditsBooked = count(p.creditsBooked, 0, creditsTotal - creditsLeft)
  if (creditsBooked === null) return null
  const validUntil = optional(p.validUntil, ymd)
  const validUntilText = optional(p.validUntilText, (v) => text(v, 80))
  const clockText = optional(p.clockText, (v) => text(v, 160))
  const unusedUntilText = optional(p.unusedUntilText, (v) => text(v, 80))
  if (validUntil === undefined || validUntilText === undefined || clockText === undefined
    || unusedUntilText === undefined) return null
  if (p.uses !== undefined && p.uses !== null && !Array.isArray(p.uses)) return null
  const uses = (Array.isArray(p.uses) ? p.uses : [])
    .map(toPackUse)
    .filter((u): u is PackUseView => u !== null)
    .slice(0, MAX_USES)
  return {
    ref, sport, sportId, name, creditsTotal, creditsLeft, creditsBooked, status,
    validUntil, validUntilText, clock, clockText, unusedUntilText,
    bookUrl: bookWithPackUrl(sportId),
    uses,
  }
}

/* ── the quote (POST /api/public/guest-packs/quote, design §6.2) ────────────────────── */

/** Why no pack can pay for this slot, most specific first (design §3, "Refusal priority"),
 *  plus 'all_booked' (every credit booked, none played yet — §8.1's third wording).
 *
 *  'too_far_ahead', 2026-10-22. Aniket: "let's make the pack bookings upto 60 days for 5 pack
 *  and 120 days for 10 pack.. cancel and re-booking is fine." A pack booking may be made up
 *  to the pack's own play window ahead (60 / 120 days from today, club-local) instead of the
 *  club's card window (30 at Exton); the slot is past that for every pack the guest could
 *  otherwise use. Where it ranks against the others is the platform's (CP_REFUSAL_ORDER);
 *  this list is only the set of reasons the site knows a sentence for. */
export type PackRefusalReason =
  | 'no_pack' | 'wrong_sport' | 'too_many_credits' | 'closed' | 'used_up' | 'all_booked'
  | 'expired' | 'too_far_ahead' | 'outside_window' | 'not_enough_credits'

/**
 * A refusal and the details its sentence needs (lib/my-bookings/copy.ts refusalText).
 * Every detail is optional on the wire and null here when absent or malformed: the reason
 * alone still makes a true sentence.
 */
export type PackRefusalView = {
  reason: PackRefusalReason
  need: number | null // credits this booking needs
  sports: string[] // wrong_sport: the sports the guest's packs ARE for
  maxCredits: number | null // too_many_credits: the largest pack
  creditsLeft: number | null // not_enough_credits: the best pack's credits left
  creditsTotal: number | null // used_up / all_booked
  lo: string | null // outside_window: first usable date, YYYY-MM-DD
  // outside_window / expired: last usable date (valid until). On 'expired' the platform sends
  // it as validUntil (refusalOf reads that first, 2026-10-22); held here as hi either way.
  hi: string | null
  // too_far_ahead (2026-10-22): the furthest ahead, in days from today, that any of the
  // guest's otherwise-usable packs of this sport can book — the platform's max_days, sent as
  // maxDays like every other detail (max_credits → maxCredits). A pack's horizon is its
  // play_window_days, so it is bounded as an offer's window is (7–366); outside that, null,
  // and the sentence says less.
  maxDays: number | null
}

export const PACK_REFUSALS: readonly PackRefusalReason[] = [
  'no_pack', 'wrong_sport', 'too_many_credits', 'closed', 'used_up', 'all_booked',
  'expired', 'too_far_ahead', 'outside_window', 'not_enough_credits',
]

/**
 * Refusals whose way on is another DATE, not a card (2026-10-22): the pack pages show "Pick
 * another time" for these where every other refusal shows "Pay by card". A date too far
 * ahead for the guest's pack is too far for a card as well — every pack horizon Exton sells
 * (60 and 120 days) is longer than its card window (30, copy.ts CARD_WINDOW_DAYS) — so "Pay
 * by card" would only walk the guest to the app form's "Card bookings open 30 days ahead."
 */
export const PICK_ANOTHER_REFUSALS: readonly PackRefusalReason[] = ['too_far_ahead']

function refusalOf(r: Record<string, unknown> | null, reason: unknown): PackRefusalView | null {
  const why = PACK_REFUSALS.find((x) => x === reason)
  if (!r || !why) return null
  const sports = Array.isArray(r.sports)
    ? r.sports.map((s) => text(s, 60)).filter((s): s is string => s !== null).slice(0, 5)
    : []
  // 2026-10-22 (review of the booking horizon): the platform's 'expired' refusal is
  // { reason: 'expired', validUntil } (orangish-app lib/court-pack-rules.ts PackRefusal), and
  // this read only `hi`, so "expired on Nov 29" lost its date. validUntil first; `hi` still
  // counts, because this site's own book route echoes a PackRefusalView (hi) to the browser
  // (fromSiteBook), and the platform may send hi beside validUntil.
  const hi = why === 'expired' ? (ymd(r.validUntil) ?? ymd(r.hi)) : ymd(r.hi)
  return {
    reason: why,
    need: count(r.need, 1, 20),
    sports,
    maxCredits: count(r.maxCredits, 1, 20),
    creditsLeft: count(r.creditsLeft, 0, 20),
    creditsTotal: count(r.creditsTotal, 1, 20),
    lo: ymd(r.lo),
    hi,
    maxDays: count(r.maxDays, 7, 366),
  }
}

/** The slot as the platform priced it. credits = courts × hours, always (design §3). */
export type QuoteSlot = {
  sport: string
  sportId: string
  unit: 'court' | 'lane'
  courts: number
  hours: number
  whenText: string
  credits: number
  cardTotalCents: number // the same slot by card
  creditValueCents: number
  savesCents: number // may be ≤ 0; copy.ts savesLine shows it only when positive
}
export type SlotProblem = { code: string; message: string }
/**
 * The pack this booking would draw from (design §6.2 `choice`), as it will read AFTER this
 * booking (orangish-app lib/court-pack-book.ts choiceFor: cp_window with this booking added).
 * `clock` (2026-10-21, integration — S2 asked for it) is the clock those two sentences
 * belong to: 'started' prints "valid until X (…)", the others print the clock sentence
 * alone. null when the platform did not send one; the page then works it out (pack page).
 */
export type PackChoice = {
  packName: string
  creditsLeftAfter: number
  creditsTotal: number
  validUntilText: string | null
  clockText: string | null
  clock: PackClock | null
}

export type QuoteView = {
  slot: QuoteSlot | null // exactly one of slot / slotProblem
  slotProblem: SlotProblem | null
  terms: { version: string; url: string } // the BOOKING terms and waiver, on the platform
  session: 'none' | 'match'
  cardUrl: string // built here: lib/booking.ts bookByCardUrl
  // ⛔ 'match' only. On 'none' these are null / [] whatever was sent.
  email: string | null // masked
  packs: PackView[]
  choice: PackChoice | null // exactly one of choice / refusal when there is a slot
  refusal: PackRefusalView | null
}

function toSlot(raw: unknown, sportId: string): QuoteSlot | null {
  const s = obj(raw)
  if (!s) return null
  const sport = text(s.sport, 60)
  const unit = s.unit === 'court' || s.unit === 'lane' ? s.unit : null
  const courts = count(s.courts, 1, 4)
  const hours = count(s.hours, 1, 12)
  const whenText = text(s.whenText)
  const credits = count(s.credits, 1, 20)
  const cardTotalCents = cents(s.cardTotalCents)
  const creditValueCents = cents(s.creditValueCents)
  const savesCents = typeof s.savesCents === 'number' && Number.isInteger(s.savesCents)
    && Math.abs(s.savesCents) <= 10_000_000 ? s.savesCents : null
  if (!sport || !unit || courts === null || hours === null || !whenText || credits === null
    || cardTotalCents === null || creditValueCents === null || savesCents === null) return null
  // The answer must be about the slot we asked about, priced by the one cost rule.
  if (s.sportId !== sportId || credits !== courts * hours) return null
  return { sport, sportId, unit, courts, hours, whenText, credits, cardTotalCents, creditValueCents, savesCents }
}

function toSlotProblem(raw: unknown): SlotProblem | null {
  const p = obj(raw)
  const code = p && typeof p.code === 'string' && /^[a-z_]{1,40}$/.test(p.code) ? p.code : null
  const message = p && text(p.message, 300)
  return code && message ? { code, message } : null
}

function toChoice(raw: unknown): PackChoice | null {
  const c = obj(raw)
  if (!c) return null
  const packName = text(c.packName, 60)
  const creditsTotal = count(c.creditsTotal, 1, 20)
  const creditsLeftAfter = creditsTotal === null ? null : count(c.creditsLeftAfter, 0, creditsTotal)
  const validUntilText = optional(c.validUntilText, (v) => text(v, 80))
  const clockText = optional(c.clockText, (v) => text(v, 160))
  const clock = optional(c.clock, (v) => PACK_CLOCKS.find((k) => k === v) ?? null)
  if (!packName || creditsTotal === null || creditsLeftAfter === null
    || validUntilText === undefined || clockText === undefined || clock === undefined) return null
  return { packName, creditsLeftAfter, creditsTotal, validUntilText, clockText, clock }
}

/**
 * The platform's quote for the parked slot, or null — which the pack page shows as "We
 * couldn't reach the booking system". `sel` is the slot this site asked about: the answer
 * must be for its sport, and "Pay by card instead" is built from it.
 */
export function toQuote(json: unknown, sel: BookingSlot): QuoteView | null {
  const j = obj(json)
  if (!j) return null
  const session = j.session === 'match' || j.session === 'none' ? j.session : null
  const terms = obj(j.terms)
  const version = terms && text(terms.version, 40)
  const url = terms && appHref(terms.url)
  if (!session || !version || !url) return null
  const hasSlot = j.slot !== undefined && j.slot !== null
  const hasProblem = j.slotProblem !== undefined && j.slotProblem !== null
  if (hasSlot === hasProblem) return null
  const slot = hasSlot ? toSlot(j.slot, sel.sportId) : null
  const slotProblem = hasProblem ? toSlotProblem(j.slotProblem) : null
  if (hasSlot ? !slot : !slotProblem) return null
  const view: QuoteView = {
    slot, slotProblem, terms: { version, url }, session, cardUrl: bookByCardUrl(sel),
    email: null, packs: [], choice: null, refusal: null,
  }
  if (session === 'none') return view

  const email = masked(j.email)
  if (!email) return null
  if (j.packs !== undefined && j.packs !== null && !Array.isArray(j.packs)) return null
  const packs = (Array.isArray(j.packs) ? j.packs : []).map(toPack).filter((p): p is PackView => p !== null)
  const choice = j.choice === undefined || j.choice === null ? null : toChoice(j.choice)
  if (choice === null && j.choice !== undefined && j.choice !== null) return null
  const r = obj(j.refusal)
  const refusal = j.refusal === undefined || j.refusal === null ? null : refusalOf(r, r?.reason)
  if (refusal === null && j.refusal !== undefined && j.refusal !== null) return null
  if (choice && refusal) return null
  if (slot && !choice && !refusal) return null
  return { ...view, email, packs, choice, refusal }
}

/* ── the book answer (POST /api/public/guest-packs/book, design §6.2) ───────────────── */

export type BookStatus =
  | 'booked' | 'already' // the only two that spent a credit (isBookSuccess)
  | PackRefusalReason
  | 'taken' | 'started' | 'no_rate' | 'club_closed_hours'
  | 'changed' | 'credits_changed' | 'terms_required' | 'terms_changed' | 'bad_phone'
  | 'signed_out' | 'off' | 'slow_down' | 'try_again' | 'unknown'

export type BookedBooking = {
  seriesId: string
  whenText: string
  courts: string[] // every court by name — never a count, never a range
  credits: number
  lightsNote: string | null // the platform's LIGHTS_NOTE when this sport's lights are automatic
}
export type BookedPack = {
  name: string
  creditsLeft: number
  creditsTotal: number
  validUntilText: string | null
  clockText: string | null
  // Review UI-7, 2026-10-21: whose clock validUntilText belongs to — the booked screen states
  // a firm "Valid until" only for 'started'. Optional on the wire (today's platform sends
  // none; the page then uses the quote's choice.clock); a value outside the set drops the block.
  clock: PackClock | null
}
export type BookView = {
  status: BookStatus
  booking?: BookedBooking // booked / already, when the details check out
  pack?: BookedPack
  refusal?: PackRefusalView // a PackRefusalReason status
}

const BOOK_STATUSES: readonly BookStatus[] = [
  'booked', 'already', ...PACK_REFUSALS,
  'taken', 'started', 'no_rate', 'club_closed_hours',
  'changed', 'credits_changed', 'terms_required', 'terms_changed', 'bad_phone',
  'signed_out', 'off', 'slow_down', 'try_again', 'unknown',
]
/** Refused before anything was written (409 from the platform). */
const BOOK_409: readonly BookStatus[] = ['taken', 'started', 'no_rate', 'club_closed_hours', 'credits_changed', 'terms_changed', 'changed']
/** Refused at the door (400 from the platform). */
const BOOK_400: readonly BookStatus[] = ['changed', 'credits_changed', 'terms_required', 'terms_changed', 'bad_phone']

function toBookedBooking(raw: unknown): BookedBooking | null {
  const b = obj(raw)
  if (!b) return null
  const seriesId = typeof b.seriesId === 'string' && UUID_RE.test(b.seriesId) ? b.seriesId : null
  const whenText = text(b.whenText)
  const credits = count(b.credits, 1, 20)
  const lightsNote = optional(b.lightsNote, (v) => text(v, 300))
  if (!seriesId || !whenText || credits === null || lightsNote === undefined) return null
  if (!Array.isArray(b.courts) || b.courts.length === 0 || b.courts.length > 4) return null
  const courts = b.courts.map((c) => text(c, 60))
  if (courts.some((c) => c === null)) return null
  return { seriesId, whenText, courts: courts as string[], credits, lightsNote }
}

function toBookedPack(raw: unknown): BookedPack | null {
  const p = obj(raw)
  if (!p) return null
  const name = text(p.name, 60)
  const creditsTotal = count(p.creditsTotal, 1, 20)
  const creditsLeft = creditsTotal === null ? null : count(p.creditsLeft, 0, creditsTotal)
  const validUntilText = optional(p.validUntilText, (v) => text(v, 80))
  const clockText = optional(p.clockText, (v) => text(v, 160))
  const clock = optional(p.clock, (v) => PACK_CLOCKS.find((k) => k === v) ?? null)
  if (!name || creditsTotal === null || creditsLeft === null || validUntilText === undefined
    || clockText === undefined || clock === undefined) return null
  return { name, creditsLeft, creditsTotal, validUntilText, clockText, clock }
}

/** booked / already, with whichever details check out. A booking whose details do not
 *  parse is STILL booked: the credit is spent, and the page must not say otherwise. */
function bookedOf(status: 'booked' | 'already', bookingRaw: unknown, packRaw: unknown): BookView {
  const v: BookView = { status }
  const booking = toBookedBooking(bookingRaw)
  if (booking) v.booking = booking
  const pack = toBookedPack(packRaw)
  if (pack) v.pack = pack
  return v
}

/**
 * The platform's answer to a pack book, as one of a closed set. httpStatus 0 = no answer.
 *
 * ⚠️ WHEN IN DOUBT, 'unknown' — "check the bookings page in a minute" (copy.ts
 * bookMessage) — the cancel rule again. A timeout or a 5xx other than 503 may have landed after cp_book_with_pack
 * committed; "nothing changed, try again" would then be a lie (a retry with the same
 * request key is safe — it answers 'already' — but the guest must not be told nothing
 * happened). Only the platform's 503 (busy, or try_again after its own re-read found no
 * booking) and refusals made before any write earn a "try again".
 */
export function toBooked(httpStatus: number, json: unknown): BookView {
  const j = obj(json) ?? {}
  const s = typeof j.status === 'string' ? j.status : j.error
  if (httpStatus === 200) {
    if (s === 'booked' || s === 'already') return bookedOf(s, j.booking, j.pack)
    return { status: 'unknown' }
  }
  if (httpStatus === 409) {
    const refusal = refusalOf(j, s)
    if (refusal) return { status: refusal.reason, refusal }
    const known = BOOK_409.find((x) => x === s)
    return known ? { status: known } : { status: 'unknown' }
  }
  if (httpStatus === 400) {
    // bad_request: the two sides disagree on the call's shape — refused before anything.
    return { status: BOOK_400.find((x) => x === s) ?? 'try_again' }
  }
  if (httpStatus === 401) return { status: 'signed_out' }
  // 404 {error:'not_available'}: court_packs is off (or the route is not deployed yet).
  if (httpStatus === 404) return { status: 'off' }
  if (httpStatus === 429) return { status: 'slow_down' }
  // 403 is the relay-secret check, the first thing the platform does; 503 is its explicit
  // busy / try_again. Nothing was booked by either.
  if (httpStatus === 403 || httpStatus === 503) return { status: 'try_again' }
  return { status: 'unknown' }
}

/**
 * The BROWSER's reading of this site's own POST /api/my-bookings/pack/book, which answers
 * 200 with a BookView for every outcome it knows. Re-checked by the same allow-list. Its
 * 4xx (403 cross-site, 400, 429) were refused before the platform was called.
 */
export function fromSiteBook(httpStatus: number, json: unknown): BookView {
  const j = obj(json) ?? {}
  if (httpStatus === 200) {
    const status = BOOK_STATUSES.find((s) => s === j.status)
    if (!status) return { status: 'unknown' }
    if (status === 'booked' || status === 'already') return bookedOf(status, j.booking, j.pack)
    const r = obj(j.refusal)
    const refusal = refusalOf(r, r?.reason)
    if (PACK_REFUSALS.includes(status as PackRefusalReason)) {
      return refusal && refusal.reason === status ? { status, refusal } : { status }
    }
    return { status }
  }
  if (httpStatus === 429) return { status: 'slow_down' }
  if (httpStatus === 400 || httpStatus === 403) return { status: 'try_again' }
  return { status: 'unknown' }
}

/** Only these two mean a credit was spent on this booking. */
export function isBookSuccess(v: BookView): boolean {
  return v.status === 'booked' || v.status === 'already'
}

/* ── buying: the offers and the purchase (design §4) ────────────────────────────────── */

/**
 * One pack on sale: a sport AND a size (2026-10-22). Aniket, 2026-10-22: two sizes per sport
 * — a 5-pack (60 days) and a 10-pack (120 days), badminton and cricket only — so an offer is
 * identified by (sportId, credits), the pair the checkout sends; no offer id ever leaves the
 * platform. The window and the unused expiry are the OFFER's own (they differ by size), never
 * a page-wide number.
 */
export type OfferView = {
  sportId: string
  sport: string
  name: string // "Badminton 10-pack"
  credits: number // 5 or 10 at Exton; any whole 1–20 the platform's CHECK allows
  priceCents: number
  perHourCents: number // priceCents / credits, exactly
  cardStandardCents: number | null // the same hour by card, from the published rates
  cardPeakCents: number | null
  windowDays: number // 60 for a 5-pack, 120 for a 10-pack: days from the first game played
  unusedMonths: number // 12: an unused pack expires this long after purchase
}
/** The court pack terms (orangish-app lib/court-pack-terms.ts), as text only — no links. */
export type PackTermsSection = { heading: string; body: string }
export type PackTermsView = { version: string; title: string; sections: PackTermsSection[] }
/**
 * The offers answer. 2026-10-22: the top-level windowDays/unusedMonths are gone from the
 * platform's answer (they were the MIN over every offer, which would have advertised a
 * 10-pack as 60 days); each offer carries its own.
 */
export type OffersView = {
  offers: OfferView[] // may be [] — nothing on sale. Sports in the platform's order, sizes ascending.
  terms: PackTermsView
}

/** An answer from before 2026-10-22 had one window for every offer, at the top level. */
type OfferFallback = { windowDays: number | null; unusedMonths: number | null }

function toOffer(raw: unknown, fallback: OfferFallback): OfferView | null {
  const o = obj(raw)
  if (!o) return null
  const sportId = typeof o.sportId === 'string' && UUID_RE.test(o.sportId) ? o.sportId : null
  const sport = text(o.sport, 60)
  const name = text(o.name, 60)
  const credits = count(o.credits, 1, 20)
  const priceCents = cents(o.priceCents)
  const perHourCents = cents(o.perHourCents)
  const cardStandardCents = optional(o.cardStandardCents, cents)
  const cardPeakCents = optional(o.cardPeakCents, cents)
  // The offer's own window, as the platform's CHECKs bound it (play_window_days 7–366,
  // unused_months 1–24). A value that is SENT but out of range drops the offer: it is never
  // replaced by the fallback, which exists only for a platform that sends none per offer
  // (one deployed ahead of the other — the site goes first, design §12). Then every offer
  // was one size per sport and the top level was that offer's own number.
  const windowDays = o.windowDays === undefined || o.windowDays === null ? fallback.windowDays : count(o.windowDays, 7, 366)
  const unusedMonths = o.unusedMonths === undefined || o.unusedMonths === null ? fallback.unusedMonths : count(o.unusedMonths, 1, 24)
  if (!sportId || !sport || !name || credits === null || !priceCents || perHourCents === null
    || cardStandardCents === undefined || cardPeakCents === undefined || windowDays === null || unusedMonths === null) return null
  // The platform's own CHECK (price_cents % credits = 0): a credit is whole cents.
  if (priceCents % credits !== 0 || perHourCents !== priceCents / credits) return null
  return { sportId, sport, name, credits, priceCents, perHourCents, cardStandardCents, cardPeakCents, windowDays, unusedMonths }
}

/**
 * One offer per (sport, size), sizes ascending within each sport, the sports in the order the
 * platform sent them (2026-10-22). The platform's unique (location_id, sport_id, credits)
 * makes a repeat impossible; if one arrives anyway, the site cannot tell which price is
 * real, so it shows NEITHER — that size is simply not offered here.
 */
function offerList(offers: OfferView[]): OfferView[] {
  const key = (o: OfferView) => `${o.sportId}:${o.credits}`
  const seen = new Map<string, number>()
  for (const o of offers) seen.set(key(o), (seen.get(key(o)) ?? 0) + 1)
  const once = offers.filter((o) => seen.get(key(o)) === 1)
  const sports = [...new Set(once.map((o) => o.sportId))]
  return sports.flatMap((s) => once.filter((o) => o.sportId === s).sort((a, b) => a.credits - b.credits))
}

function toTermsSection(raw: unknown): PackTermsSection | null {
  const s = obj(raw)
  if (!s) return null
  const heading = text(s.heading, 120)
  // A body may arrive as paragraphs; it is text either way. Links are dropped (allow-list).
  const body = Array.isArray(s.body)
    ? (s.body.every((x) => typeof x === 'string') ? text(s.body.join('\n\n'), 4000) : null)
    : text(s.body, 4000)
  return heading && body ? { heading, body } : null
}

/** GET /api/public/court-packs/offers, or null (=> "not available right now"). */
export function toOffers(json: unknown): OffersView | null {
  const j = obj(json)
  if (!j || !Array.isArray(j.offers)) return null
  const t = obj(j.terms)
  const version = t && text(t.version, 40)
  const title = t && text(t.title, 120)
  if (!t || !version || !title || !Array.isArray(t.sections) || t.sections.length > 40) return null
  const sections = t.sections.map(toTermsSection)
  if (sections.length === 0 || sections.some((s) => s === null)) return null
  // Only the fallback for an offer that carries no window of its own (see toOffer); an
  // answer without them is fine now — the 2026-10-22 platform sends none.
  const fallback: OfferFallback = { windowDays: count(j.windowDays, 7, 366), unusedMonths: count(j.unusedMonths, 1, 24) }
  const offers = offerList(j.offers.map((o) => toOffer(o, fallback)).filter((o): o is OfferView => o !== null))
  return { offers, terms: { version, title, sections: sections as PackTermsSection[] } }
}

export type PurchaseState = 'active' | 'pending' | 'unknown'
/** POST /api/public/court-packs/purchase: no pack id and no unmasked address (§4). */
export type PurchaseView = {
  state: PurchaseState
  sport: string | null
  credits: number | null
  priceCents: number | null
  maskedEmail: string | null
  // Review UI-2, 2026-10-21: the platform sends these since its integration, so the ready
  // page's "Book your first game" needs no second call to know the pack's sport.
  sportId: string | null
  name: string | null // "Badminton 10-pack"
  // 2026-10-22, two sizes: the BOUGHT pack's own window (its play_window_days snapshot), so
  // the ready page's "Valid 120 days from your first game" is this pack's rule, not a guess
  // from the offers. Optional on the wire: null when not sent, and the page then takes the
  // window of the offer matching this purchase's sport AND size.
  windowDays: number | null
  // 2026-10-29, coupons (Aniket: "let's add a textbox that accepts a COUPON CODE"): the code
  // this pack was bought with and its list price, so the ready page can say what was taken
  // off. BOTH or NEITHER (toPurchase): a code without a list price above the price paid, or
  // a list price without a code, says nothing true, so it shows no coupon at all. Nothing
  // about the holder comes with them.
  couponCode: string | null
  listPriceCents: number | null
}

export function toPurchase(json: unknown): PurchaseView | null {
  const j = obj(json)
  if (!j) return null
  const state = j.state === 'active' || j.state === 'pending' || j.state === 'unknown' ? j.state : null
  if (!state) return null
  const priceCents = cents(j.priceCents)
  const couponCode = typeof j.couponCode === 'string' && COUPON_CODE_RE.test(j.couponCode) ? j.couponCode : null
  const list = cents(j.listPriceCents)
  const coupon = couponCode !== null && list !== null && priceCents !== null && list > priceCents
  return {
    state,
    sport: text(j.sport, 60),
    credits: count(j.credits, 1, 20),
    priceCents,
    maskedEmail: masked(j.maskedEmail),
    sportId: typeof j.sportId === 'string' && UUID_RE.test(j.sportId) ? j.sportId : null,
    name: text(j.name, 60),
    windowDays: count(j.windowDays, 7, 366),
    couponCode: coupon ? couponCode : null,
    listPriceCents: coupon ? list : null,
  }
}

/* ── a coupon's quote (POST /api/public/court-packs/quote, 2026-10-29) ──────────────────
   Aniket, 2026-10-29: "let's add a textbox that accepts a COUPON CODE", then DIWALI2026,
   through Sun 8 Nov, at "5% pls..". The platform answers what each offer costs under the code
   (cp_coupon_quote → cp_coupon_unit, the SAME arithmetic cp_create_pending charges with), and
   this is the only way that answer reaches a page. */

/** One offer's price under the coupon. (sportId, credits) names the offer, as at checkout. */
export type CouponPriceView = { sportId: string; credits: number; listPriceCents: number; priceCents: number }
export type CouponQuoteView = {
  code: string // the code as the platform holds it — always the one asked about
  percentOff: number // 1–50, the platform's CHECK
  validUntil: string // ISO; exclusive (the platform's valid_until)
  prices: CouponPriceView[]
}

const MAX_COUPON_PRICES = 40

function toCouponPrice(raw: unknown, percentOff: number): CouponPriceView | null {
  const p = obj(raw)
  if (!p) return null
  const sportId = typeof p.sportId === 'string' && UUID_RE.test(p.sportId) ? p.sportId : null
  const credits = count(p.credits, 1, 20)
  const listPriceCents = cents(p.listPriceCents)
  const priceCents = cents(p.priceCents)
  if (!sportId || credits === null || !listPriceCents || !priceCents) return null
  // A credit is whole cents at both prices — the platform's own CHECKs (court_packs:
  // price_cents % credits_total = 0 and list_price_cents % credits_total = 0) — and the coupon
  // price is BELOW the list price, or there is no coupon to show.
  if (listPriceCents % credits !== 0 || priceCents % credits !== 0 || priceCents >= listPriceCents) return null
  // The page prints "5% off" beside these numbers, so they must BE 5% off. The platform rounds
  // each credit down to a whole cent (cp_coupon_unit, in the buyer's favour), so a pack may be
  // up to one cent a credit under the exact percent — never over it, and never further off.
  // The rule is a bound, not the formula: a rounding change on the platform still passes,
  // and a price that disagrees with its own percent never reaches a page.
  const exact = (listPriceCents * (100 - percentOff)) / 100
  if (priceCents > exact || exact - priceCents >= credits) return null
  return { sportId, credits, listPriceCents, priceCents }
}

/**
 * The platform's coupon quote, or null — which the form says as "try again", never as "that
 * code isn't valid": a bad answer is not the platform's refusal (that is its 400
 * coupon_invalid, platform.ts packCouponQuote). `asked` is the code this site sent: the answer
 * must be about THAT code. ONE bad price row rejects the whole answer — a coupon the site
 * cannot read for every size is not applied to some of them — and so does a repeated
 * (sport, size), as offerList refuses one, since the site could not tell which is real.
 */
export function toCouponQuote(json: unknown, asked: string): CouponQuoteView | null {
  const j = obj(json)
  if (!j || typeof asked !== 'string' || !COUPON_CODE_RE.test(asked)) return null
  const code = typeof j.code === 'string' && j.code === asked ? j.code : null
  const percentOff = count(j.percentOff, 1, 50)
  const validUntil = iso(j.validUntil)
  if (!code || percentOff === null || !validUntil) return null
  if (!Array.isArray(j.prices) || j.prices.length === 0 || j.prices.length > MAX_COUPON_PRICES) return null
  const prices = j.prices.map((p) => toCouponPrice(p, percentOff))
  if (prices.some((p) => p === null)) return null
  const rows = prices as CouponPriceView[]
  if (new Set(rows.map((p) => `${p.sportId}:${p.credits}`)).size !== rows.length) return null
  return { code, percentOff, validUntil, prices: rows }
}

export type CouponRefusal = 'coupon_invalid' | 'off' | 'slow_down' | 'try_again'
export type CouponAnswer = { ok: true; view: CouponQuoteView } | { ok: false; error: CouponRefusal }
const COUPON_REFUSALS: readonly CouponRefusal[] = ['coupon_invalid', 'off', 'slow_down', 'try_again']

/**
 * The BROWSER's reading of this site's own POST /api/court-packs/quote (2026-10-29), as
 * fromSiteCancel and fromSiteBook read theirs. The route answers 200 with the quote, or 200
 * {error} for every platform outcome; 400 {error:'coupon_invalid'} for a code it never sent
 * on (not the coupon shape). The quote is re-checked by the same allow-list, for the code the
 * form asked about. Anything else — 403 cross-site, 429, no answer, a body we do not
 * recognise — is 'slow_down' for a 429 and 'try_again' otherwise: never "not valid", which
 * only the platform (or the shape check) may say.
 */
export function fromSiteCouponQuote(httpStatus: number, json: unknown, asked: string): CouponAnswer {
  const j = obj(json) ?? {}
  if (httpStatus === 200) {
    if (j.error === undefined) {
      const view = toCouponQuote(json, asked)
      return view ? { ok: true, view } : { ok: false, error: 'try_again' }
    }
    return { ok: false, error: COUPON_REFUSALS.find((x) => x === j.error) ?? 'try_again' }
  }
  if (httpStatus === 400 && j.error === 'coupon_invalid') return { ok: false, error: 'coupon_invalid' }
  if (httpStatus === 429) return { ok: false, error: 'slow_down' }
  return { ok: false, error: 'try_again' }
}
