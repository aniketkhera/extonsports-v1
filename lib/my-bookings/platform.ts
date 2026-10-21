// The ONLY module on this site that talks to the platform for /my-bookings, 2026-10-20.
//
// Server-to-server, like app/api/court-slots/route.ts and app/api/enquiry/route.ts: the
// guest's browser never calls app.orangish.io on this path (owner, 2026-10-18 — "i want
// to stay away from the orangish-app"; guests see extonsports.com only). Bookings,
// refunds and email sending stay in the platform; this site holds the device cookie and
// renders. Contract: orangish-app docs/guest-my-bookings.md §C.
//
// What crosses, and what does not:
//   • the RELAY SECRET, as x-exton-relay-secret, on every call (below);
//   • the visitor's IP, as x-exton-client-ip, on every call (below);
//   • the device token, as `Authorization: Bearer`, read from OUR httpOnly cookie;
//   • the typed email / code / link token, on the three sign-in calls only;
//   • NOT the visitor's cookies or any other browser header.
//
// ⛔ THE RELAY SECRET (security review, 2026-10-20). The first pass had none, so anyone
// could call the platform's guest-access endpoints directly — and the platform's
// club-wide caps, which counted decoy requests, could then be run dry by one script,
// silently stopping every real guest's link email and locking out "Show my bookings".
// Now the platform refuses those endpoints unless this header carries EXTON_RELAY_SECRET,
// the SAME value set in both Vercel projects (this site's and orangish-app's), and only
// with it does the platform trust x-exton-client-ip for its per-IP limits.
//   • Server-side only: read from process.env here, at call time, and never sent to a
//     browser. Not NEXT_PUBLIC_, and no "use client" file imports this module (the test
//     suite checks both).
//   • FAILS CLOSED: unset, blank or shorter than 32 characters, and this module makes no
//     call at all — every function returns the same answer as "platform down", so the
//     page shows its friendly "not available right now" state. Setting it in both
//     projects is a switch-on step (lib/booking.ts MY_BOOKINGS_LIVE). Generate one with
//     `openssl rand -base64 32`. Surrounding whitespace is trimmed (a value pasted into
//     Vercel with a trailing newline would otherwise never match).
//
// cache:'no-store' everywhere, never `revalidate` — every answer here is one person's.
//
// THE COURT 5-PACK (2026-10-21, orangish-app docs/court-packs.md §4, §6.2) adds five
// relays at the end of this file — packOffers, packCheckout, packPurchase, packQuote,
// packBook — under the same rules: the relay secret and the visitor's IP on every call,
// no call at all without the secret, the device token only as a bearer and only where a
// device acts (quote, when there is one, and book), and every answer through ./view.ts.

import { CHECKOUT_SESSION_RE, REQUEST_KEY_RE, TOKEN_RE, parsePackSelection, type PackSelection } from './session'
import {
  toBooked, toCancelView, toOffers, toPurchase, toQuote, toView,
  type BookView, type CancelView, type ListView, type OffersView, type PurchaseView, type QuoteView,
  type RedeemRefusal,
} from './view'

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')
// The platform's locations.slug for Exton — NOT a town name (exton-sports). A wrong slug
// fails as 404 not_available, i.e. silently "try again"; see the club-slug note in
// lib/booking.ts.
const CLUB = process.env.EXTON_CLUB_SLUG || 'exton-sports'
const SCOPE = 'guest_court_bookings'

/** Header names: part of the contract with orangish-app (docs/guest-my-bookings.md §C). */
export const RELAY_SECRET_HEADER = 'x-exton-relay-secret'
export const CLIENT_IP_HEADER = 'x-exton-client-ip'

// Printable ASCII with no spaces (it is a header value), and long enough to be a secret.
const SECRET_RE = /^[\x21-\x7e]{32,256}$/
// An IPv4 or IPv6 address as text. Anything else — clientIp's 'unknown' included — is
// not sent, so the platform never keys a limit on a value a client made up.
const IP_RE = /^[0-9A-Fa-f:.]{2,45}$/

/** EXTON_RELAY_SECRET, or null when it is not usable, which switches this module off. */
function relaySecret(): string | null {
  const s = (process.env.EXTON_RELAY_SECRET ?? '').trim()
  return SECRET_RE.test(s) ? s : null
}

function headersFor(secret: string, ip: string, token?: string, json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json', [RELAY_SECRET_HEADER]: secret }
  if (json) h['Content-Type'] = 'application/json'
  if (IP_RE.test(ip)) h[CLIENT_IP_HEADER] = ip
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function post(
  secret: string,
  ip: string,
  path: string,
  body: unknown,
  ms: number,
  token?: string,
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: headersFor(secret, ip, token, true),
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(ms),
  })
}

async function jsonOf(res: Response): Promise<unknown> {
  return res.json().catch(() => null)
}

function errorOf(j: unknown): unknown {
  return j && typeof j === 'object' ? (j as { error?: unknown }).error : undefined
}

/**
 * Ask the platform to email a link + code. 'ok' covers 202, which the platform answers
 * alike whether it sent an email, found no bookings, or held a new email back because that
 * inbox already has a live link (second review, 2026-10-20: it no longer counts requests per
 * address, so a stranger cannot spend a guest's allowance — COPY.sent says the earlier
 * link still works). Any other 429 than 'busy' is read as 'ok' too, so no limit can become
 * a signal about one address. 10 s: the platform answers before it sends, so the wait is
 * short, and the page can then say honestly when it is down.
 *
 * 429 {"error":"busy"} is the exception (security review, 2026-10-20): the CLUB-WIDE
 * send cap is full. That state is the same for every address, so saying so reveals
 * nothing about any one of them, and reading it as 'ok' would tell a real guest "we've
 * sent a link" when nothing was sent. It becomes 'try_again', the honest "we couldn't
 * send that just now".
 *
 * `ip` is clientIp() of the visitor's request (./guard.ts); every function here takes it.
 */
export async function requestLink(email: string, ip: string): Promise<'ok' | 'bad_email' | 'try_again'> {
  const secret = relaySecret()
  if (!secret) return 'try_again'
  try {
    const res = await post(secret, ip, '/api/public/guest-access/request', { club: CLUB, scope: SCOPE, email }, 10_000)
    if (res.status === 202 || res.status === 200) return 'ok'
    if (res.status === 429) return errorOf(await jsonOf(res)) === 'busy' ? 'try_again' : 'ok'
    if (res.status === 400 && errorOf(await jsonOf(res)) === 'bad_email') return 'bad_email'
    return 'try_again'
  } catch {
    return 'try_again'
  }
}

export type RedeemResult =
  | { ok: true; deviceToken: string; expiresAt: string }
  | { ok: false; error: RedeemRefusal }

/**
 * Trade a link token or an email + code for a device token. Every refusal is ONE answer
 * ('invalid') — dead link, wrong code, exhausted, decoy, unknown address — because the
 * platform makes them one answer too. A 200 whose token is not the right shape is
 * 'try_again', not success: no cookie is set from a value we cannot vouch for.
 *
 * Only a 400 that SAYS {"error":"invalid"} is 'invalid', the one answer that throws the
 * guest's parked link away (./view.ts redeemRefusal). Since the security review of
 * 2026-10-20 a 429 is 'slow_down', not 'invalid': a limit someone else ran up must not
 * read as "your link has expired". Any other 400 (bad_request: the two sides disagree on
 * the call's shape) is 'try_again', and keeps the link too.
 */
export async function redeem(
  input: { link: string } | { email: string; code: string },
  ip: string,
): Promise<RedeemResult> {
  const secret = relaySecret()
  if (!secret) return { ok: false, error: 'try_again' }
  try {
    const res = await post(secret, ip, '/api/public/guest-access/redeem', { club: CLUB, scope: SCOPE, ...input }, 10_000)
    if (res.status === 429) return { ok: false, error: 'slow_down' }
    if (res.status === 400) {
      return { ok: false, error: errorOf(await jsonOf(res)) === 'invalid' ? 'invalid' : 'try_again' }
    }
    if (res.status !== 200) return { ok: false, error: 'try_again' }
    const j = (await jsonOf(res)) as { deviceToken?: unknown; expiresAt?: unknown } | null
    const deviceToken = typeof j?.deviceToken === 'string' && TOKEN_RE.test(j.deviceToken) ? j.deviceToken : null
    const expiresAt = typeof j?.expiresAt === 'string' && Number.isFinite(Date.parse(j.expiresAt)) ? j.expiresAt : null
    if (!deviceToken || !expiresAt) return { ok: false, error: 'try_again' }
    return { ok: true, deviceToken, expiresAt }
  } catch {
    return { ok: false, error: 'try_again' }
  }
}

export type ListResult = { kind: 'ok'; view: ListView } | { kind: 'signed_out' } | { kind: 'unavailable' }

/**
 * This device's upcoming bookings. Only a 401 means signed out; anything else that is not
 * a clean 200 — a 503, a timeout, a body that fails the allow-list, no relay secret — is
 * 'unavailable', which the page says plainly. It is never rendered as an empty list.
 */
export async function listBookings(token: string, ip: string): Promise<ListResult> {
  const secret = relaySecret()
  if (!secret) return { kind: 'unavailable' }
  try {
    const res = await fetch(`${API_BASE}/api/public/guest-bookings`, {
      headers: headersFor(secret, ip, token),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    })
    if (res.status === 401) return { kind: 'signed_out' }
    if (res.status !== 200) return { kind: 'unavailable' }
    const view = toView(await jsonOf(res))
    return view ? { kind: 'ok', view } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

/**
 * Cancel one series. 55 s, inside the route's maxDuration of 60: the platform reads the
 * PaymentIntent, claims, refunds and releases inside this one call, and cutting it short
 * would only turn a finished refund into 'unknown'. A timeout IS 'unknown' — see
 * toCancelView — never "try again". With no relay secret nothing is sent at all, so
 * 'try_again' ("nothing has changed") is then the truth.
 */
export async function cancelBooking(token: string, seriesId: string, ip: string): Promise<CancelView> {
  const secret = relaySecret()
  if (!secret) return { status: 'try_again' }
  try {
    const res = await post(
      secret,
      ip,
      `/api/public/guest-bookings/${encodeURIComponent(seriesId)}/cancel`,
      {},
      55_000,
      token,
    )
    return toCancelView(res.status, await jsonOf(res))
  } catch {
    return toCancelView(0, null)
  }
}

/** Revoke this device's session upstream. Best effort: the cookie is cleared regardless. */
export async function signOut(token: string, ip: string): Promise<void> {
  const secret = relaySecret()
  if (!secret) return // nobody upstream would listen; the session row expires on its own
  try {
    await post(secret, ip, '/api/public/guest-access/sign-out', {}, 5_000, token)
  } catch {
    /* the cookie is already gone; an unrevoked row expires on its own */
  }
}

/* ══ THE COURT 5-PACK (2026-10-21) ═════════════════════════════════════════════════════
   Five relays, one per platform endpoint. Each one: no secret → no call and the "platform
   down" answer; anything that is not a clean, allow-listed answer → that same answer,
   except packBook, whose doubt is 'unknown' (./view.ts toBooked). Inputs are re-checked
   here even though the calling route checked them: this module is the last place a
   malformed value could still be kept off the wire. */

/** The 'off' answer is the platform's 404 not_available: its flag is off for this club. */
export type OffersResult = { kind: 'ok'; view: OffersView } | { kind: 'off' } | { kind: 'unavailable' }

/**
 * What a 5-pack costs, per sport, and the 5-pack terms (design §4). The public variant
 * answers 404 unless court_packs_public is on; `desk: true` asks for the variant that
 * needs only court_packs — for /5-pack/terms, which a DESK sale's Checkout links to
 * ("By paying you agree to the 5-pack terms: www.extonsports.com/5-pack/terms") before
 * any public sale exists. 5 s, like the list: a page waits on it.
 */
export async function packOffers(ip: string, opts: { desk?: boolean } = {}): Promise<OffersResult> {
  const secret = relaySecret()
  if (!secret) return { kind: 'unavailable' }
  const q = new URLSearchParams({ club: CLUB })
  if (opts.desk) q.set('desk', '1')
  try {
    const res = await fetch(`${API_BASE}/api/public/court-packs/offers?${q}`, {
      headers: headersFor(secret, ip),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    })
    if (res.status === 404) return { kind: 'off' }
    if (res.status !== 200) return { kind: 'unavailable' }
    const view = toOffers(await jsonOf(res))
    return view ? { kind: 'ok', view } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

export type CheckoutError =
  | 'bad_email' | 'terms_required' | 'terms_changed' | 'bad_sport' | 'club_not_payable'
  | 'off' | 'slow_down' | 'try_again'
export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError }

/**
 * ⛔ THE ONLY PLACE THIS SITE FOLLOWS A URL THE PLATFORM SENT, so it is checked: https on
 * checkout.stripe.com exactly, no credentials, no port. A Checkout the platform created and
 * this site refuses to follow costs nothing — the pending pack is abandoned by the
 * platform's reconciler once its session expires (design §4).
 */
function stripeCheckoutUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 4096) return null
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && u.hostname === 'checkout.stripe.com' && !u.username && !u.password && !u.port
      ? u.href
      : null
  } catch {
    return null
  }
}

const CHECKOUT_ERRORS: readonly CheckoutError[] = [
  'bad_email', 'terms_required', 'terms_changed', 'bad_sport', 'club_not_payable',
]

/**
 * Start buying a pack: the platform makes a pending pack and a Stripe Checkout for it,
 * priced from ITS row, never from this call (design §4). The tick is passed through as it
 * arrived — the platform refuses terms_required itself. 25 s: the platform calls Stripe
 * inside this request. A timeout is 'try_again': nothing is charged until the guest pays
 * on Stripe's page, which they never reached.
 */
export async function packCheckout(
  input: { sportId: string; email: string; agreeTerms: boolean; termsVersion: string },
  ip: string,
): Promise<CheckoutResult> {
  const secret = relaySecret()
  if (!secret) return { ok: false, error: 'try_again' }
  try {
    const res = await post(secret, ip, '/api/public/court-packs/checkout', {
      club: CLUB,
      sportId: input.sportId,
      email: input.email,
      agreeTerms: input.agreeTerms === true,
      termsVersion: input.termsVersion,
    }, 25_000)
    const j = await jsonOf(res)
    if (res.status === 200) {
      const url = stripeCheckoutUrl(j && typeof j === 'object' ? (j as { url?: unknown }).url : undefined)
      return url ? { ok: true, url } : { ok: false, error: 'try_again' }
    }
    if (res.status === 404) return { ok: false, error: 'off' }
    if (res.status === 429) return { ok: false, error: 'slow_down' }
    if (res.status === 400 || res.status === 409) {
      const e = CHECKOUT_ERRORS.find((x) => x === errorOf(j))
      return { ok: false, error: e ?? 'try_again' }
    }
    return { ok: false, error: 'try_again' }
  } catch {
    return { ok: false, error: 'try_again' }
  }
}

export type PurchaseResult = { kind: 'ok'; view: PurchaseView } | { kind: 'unavailable' }

/**
 * After Stripe: is the pack for this Checkout ready (design §4, /my-bookings/pack/ready?cs=).
 * A session id that is not the cs_ shape is never sent — the page checks it first
 * (./session.ts CHECKOUT_SESSION_RE) and shows its "can't find that payment" state; here it
 * is simply 'unavailable'. A 404 (the flag switched off since the guest paid) is
 * 'unavailable' too: a paid purchase settles regardless (the webhook does not check the
 * flag) and the receipt says so.
 */
export async function packPurchase(sessionId: string, ip: string): Promise<PurchaseResult> {
  const secret = relaySecret()
  if (!secret || typeof sessionId !== 'string' || !CHECKOUT_SESSION_RE.test(sessionId)) return { kind: 'unavailable' }
  try {
    const res = await post(secret, ip, '/api/public/court-packs/purchase', { club: CLUB, sessionId }, 10_000)
    if (res.status !== 200) return { kind: 'unavailable' }
    const view = toPurchase(await jsonOf(res))
    return view ? { kind: 'ok', view } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

/** A slot this module would send: the same rules as the cookie it came from. */
function sendableSel(sel: PackSelection): PackSelection | null {
  if (!sel || typeof sel !== 'object') return null
  const q = new URLSearchParams({
    s: String(sel.sportId), d: String(sel.date), t: String(sel.startTime), h: String(sel.hours), n: String(sel.courts),
  })
  if (sel.preferCourtId) q.set('c', String(sel.preferCourtId))
  return parsePackSelection(q)
}

export type QuoteResult = { kind: 'ok'; view: QuoteView } | { kind: 'off' } | { kind: 'unavailable' }

/**
 * What the parked slot costs in credits, and — only when this device's session matches —
 * which pack would pay (design §6.2). The device token goes as a bearer when there is a
 * well-formed one; without it the platform answers session 'none' and no pack facts. A
 * stale token is not a 401 here (the platform reads it as 'none'), so the page simply asks
 * for the code. 10 s.
 */
export async function packQuote(sel: PackSelection, ip: string, token?: string | null): Promise<QuoteResult> {
  const secret = relaySecret()
  const slot = sendableSel(sel)
  if (!secret || !slot) return { kind: 'unavailable' }
  const bearer = typeof token === 'string' && TOKEN_RE.test(token) ? token : undefined
  try {
    const res = await post(secret, ip, '/api/public/guest-packs/quote', { club: CLUB, scope: SCOPE, sel: slot }, 10_000, bearer)
    if (res.status === 404) return { kind: 'off' }
    if (res.status !== 200) return { kind: 'unavailable' }
    const view = toQuote(await jsonOf(res), slot)
    return view ? { kind: 'ok', view } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

export type PackBookInput = {
  sel: PackSelection
  requestKey: string // ./session.ts mintRequestKey, minted by the page
  agreeTerms: boolean
  termsVersion: string // the BOOKING terms' version the page showed
  expectCredits: number // what the page said "Book · use N credits" for
  phone?: string | null
}

/**
 * Book the parked slot with a pack: the platform creates the courts AND spends the credit
 * in one transaction (cp_book_with_pack, design §6.3), keyed by requestKey so a retry
 * books once. Malformed input is never sent ('try_again': nothing has changed); a token
 * this site would not present is 'signed_out'. 25 s — the calling route needs a
 * maxDuration of at least 30: no Stripe call is made, but the transaction waits on the
 * club's booking lock. A timeout is 'unknown' (./view.ts toBooked), never "try again".
 */
export async function packBook(input: PackBookInput, token: string, ip: string): Promise<BookView> {
  const secret = relaySecret()
  if (!secret) return { status: 'try_again' }
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return { status: 'signed_out' }
  const slot = sendableSel(input.sel)
  const termsVersion = typeof input.termsVersion === 'string' && input.termsVersion.length > 0
    && input.termsVersion.length <= 40 ? input.termsVersion : null
  if (!slot || typeof input.requestKey !== 'string' || !REQUEST_KEY_RE.test(input.requestKey) || !termsVersion
    || !Number.isInteger(input.expectCredits) || input.expectCredits < 1 || input.expectCredits > 20) {
    return { status: 'try_again' }
  }
  const body: Record<string, unknown> = {
    club: CLUB,
    scope: SCOPE,
    sel: slot,
    requestKey: input.requestKey,
    agreeTerms: input.agreeTerms === true,
    termsVersion,
    expectCredits: input.expectCredits,
  }
  if (typeof input.phone === 'string' && input.phone.trim()) body.phone = input.phone.trim()
  try {
    const res = await post(secret, ip, '/api/public/guest-packs/book', body, 25_000, token)
    return toBooked(res.status, await jsonOf(res))
  } catch {
    return toBooked(0, null)
  }
}
