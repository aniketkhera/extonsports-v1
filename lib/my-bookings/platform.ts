// The ONLY module on this site that talks to the platform for /my-bookings, 2026-10-20.
//
// Server-to-server, like app/api/court-slots/route.ts and app/api/enquiry/route.ts: the
// guest's browser never calls app.orangish.io on this path (owner, 2026-10-18 — "i want
// to stay away from the orangish-app"; guests see extonsports.com only). Bookings,
// refunds and email sending stay in the platform; this site holds the device cookie and
// renders. Contract: orangish-app docs/guest-my-bookings.md §C.
//
// What crosses, and what does not:
//   • the device token, as `Authorization: Bearer`, read from OUR httpOnly cookie;
//   • the typed email / code / link token, on the three sign-in calls only;
//   • NOT the visitor's cookies, headers or IP — the platform limits on email hash and
//     session, never on IP, because every call arrives from this site's egress anyway.
// No shared secret: a stolen call can do nothing a visitor to this page cannot.
//
// cache:'no-store' everywhere, never `revalidate` — every answer here is one person's.

import { TOKEN_RE } from './session'
import { toCancelView, toView, type CancelView, type ListView } from './view'

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')
// The platform's locations.slug for Exton — NOT a town name (exton-sports). A wrong slug
// fails as 404 not_available, i.e. silently "try again"; see the club-slug note in
// lib/booking.ts.
const CLUB = process.env.EXTON_CLUB_SLUG || 'exton-sports'
const SCOPE = 'guest_court_bookings'

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' }

async function post(path: string, body: unknown, ms: number, token?: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { ...JSON_HEADERS, Authorization: `Bearer ${token}` } : JSON_HEADERS,
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(ms),
  })
}

async function jsonOf(res: Response): Promise<unknown> {
  return res.json().catch(() => null)
}

/**
 * Ask the platform to email a link + code. 'ok' covers 202 AND 429: the platform answers
 * a rate-limited address the same way the page answers everyone ("if this email has
 * bookings…"), so a limit is not a signal either. 10 s: the platform answers before it
 * sends, so the wait is short, and the page can then say honestly when it is down.
 */
export async function requestLink(email: string): Promise<'ok' | 'bad_email' | 'try_again'> {
  try {
    const res = await post('/api/public/guest-access/request', { club: CLUB, scope: SCOPE, email }, 10_000)
    if (res.status === 202 || res.status === 200 || res.status === 429) return 'ok'
    if (res.status === 400) {
      const j = (await jsonOf(res)) as { error?: unknown } | null
      if (j?.error === 'bad_email') return 'bad_email'
    }
    return 'try_again'
  } catch {
    return 'try_again'
  }
}

export type RedeemResult =
  | { ok: true; deviceToken: string; expiresAt: string }
  | { ok: false; error: 'invalid' | 'try_again' }

/**
 * Trade a link token or an email + code for a device token. Every refusal is ONE answer
 * ('invalid') — dead link, wrong code, exhausted, decoy, unknown address — because the
 * platform makes them one answer too. A 200 whose token is not the right shape is
 * 'try_again', not success: no cookie is set from a value we cannot vouch for.
 */
export async function redeem(input: { link: string } | { email: string; code: string }): Promise<RedeemResult> {
  try {
    const res = await post('/api/public/guest-access/redeem', { club: CLUB, scope: SCOPE, ...input }, 10_000)
    if (res.status === 400 || res.status === 429) return { ok: false, error: 'invalid' }
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
 * a clean 200 — a 503, a timeout, a body that fails the allow-list — is 'unavailable',
 * which the page says plainly. It is never rendered as an empty list.
 */
export async function listBookings(token: string): Promise<ListResult> {
  try {
    const res = await fetch(`${API_BASE}/api/public/guest-bookings`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
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
 * toCancelView — never "try again".
 */
export async function cancelBooking(token: string, seriesId: string): Promise<CancelView> {
  try {
    const res = await post(`/api/public/guest-bookings/${encodeURIComponent(seriesId)}/cancel`, {}, 55_000, token)
    return toCancelView(res.status, await jsonOf(res))
  } catch {
    return toCancelView(0, null)
  }
}

/** Revoke this device's session upstream. Best effort: the cookie is cleared regardless. */
export async function signOut(token: string): Promise<void> {
  try {
    await post('/api/public/guest-access/sign-out', {}, 5_000, token)
  } catch {
    /* the cookie is already gone; an unrevoked row expires on its own */
  }
}
