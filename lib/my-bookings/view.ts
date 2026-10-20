// What the platform's answers are allowed to become on this site, 2026-10-20. Pure.
//
// ⛔ AN ALLOW-LIST, NOT A PASS-THROUGH — the same rule as app/api/court-slots/route.ts.
// The platform's GET /api/public/guest-bookings (contract §C4, orangish-app
// docs/guest-my-bookings.md) is copied field by field, each one type-checked; anything
// else it sends — today or after it grows a field — never reaches a page. A row that
// fails a check is dropped; a top level that fails is null, which the page renders as
// "can't show your bookings right now", never as "you have none".
//
// Split out of ./platform.ts so node:test can load it without fetch or env.

import { UUID_RE } from './guard'

export type BookingStatus = 'active' | 'cancelling' | 'needs_staff' | 'cancelled'
export type BlockedReason = 'within_cutoff' | 'call_club' | null

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
}

export type ListView = {
  club: { name: string; phone: string }
  email: string | null
  cutoffHours: number
  bookings: BookingView[]
}

export type CancelStatus =
  | 'cancelled' | 'already_cancelled' | 'processing' | 'too_late' | 'in_progress'
  | 'not_cancellable' | 'needs_staff' | 'not_found' | 'signed_out' | 'try_again' | 'unknown'

export type CancelView = { status: CancelStatus; refundedCents?: number; phone?: string }

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
  return {
    seriesId, sport, whenText, startsAt, cancelBy, cancelByText,
    courts: courts as string[],
    amountPaidCents,
    status,
    // Belt and braces: only an ACTIVE booking ever shows a Cancel button, whatever the
    // flag says. The platform re-checks everything on the POST regardless.
    cancellable: r.cancellable && status === 'active',
    blockedReason,
    refundedCents: status === 'cancelled' ? refundedCents : null,
  }
}

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
  return { club: { name, phone }, email, cutoffHours, bookings }
}

/**
 * The platform's answer to POST …/guest-bookings/{id}/cancel (contract §C5), as one of a
 * closed set. httpStatus 0 = no answer at all (timeout, network).
 *
 * ⚠️ WHEN IN DOUBT, 'unknown' — "reload in a minute to check" — NEVER 'try_again'. A
 * timeout or a 5xx other than 503 may have landed after Stripe refunded; telling the
 * guest "nothing changed, try again" would be a lie half the time. Only the platform's
 * explicit 503 try_again (refused before any money moved) earns 'try_again'.
 */
export function toCancelView(httpStatus: number, json: unknown): CancelView {
  const j = obj(json) ?? {}
  const s = j.status
  const phone = phoneOf(j.phone) ?? undefined
  const refunded = cents(j.refundedCents) ?? undefined
  const withPhone = (status: CancelStatus): CancelView => (phone ? { status, phone } : { status })

  if (httpStatus === 200 && (s === 'cancelled' || s === 'already_cancelled')) {
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

/** Only these two mean the money is on its way back. */
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
