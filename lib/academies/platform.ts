// The ONLY module on this site that talks to the platform for /academies, 2026-11-16
// (orangish-app docs/academy-page.md §2, §3.3 — the contract).
//
// lib/my-bookings/platform.ts's design, call for call, against the platform's
// /api/public/academy/* instead of /api/public/guest-access/*:
//   • the RELAY SECRET (EXTON_RELAY_SECRET, the same value in both Vercel projects), as
//     x-exton-relay-secret, on every call. FAILS CLOSED: unset, blank, shorter than 32
//     characters or not a header value, and NO call is made — every function answers as if
//     the platform were down, which the page says plainly. Read from process.env here, at
//     call time, server-side only; no "use client" file imports this module (tested).
//   • the visitor's IP, as x-exton-client-ip, on every call — only when it is an IP; the
//     platform trusts it only alongside the secret and keys its per-IP limits on it.
//   • the device token, as `Authorization: Bearer`, from OUR httpOnly cookie, and only where
//     a signed-in phone acts (overview, day, add, sign-out) — never on request or redeem.
//   • NOT the visitor's cookies or any other browser header, and never a token in a URL.
//   • cache:'no-store' everywhere — every answer is one partner's.
//
// THE CLUB (§3.2: relayGate first, then resolveAcademyClub): the platform knows which club
// from the relay secret. Request and redeem still say `club` and `scope:'academy'` in their
// bodies, as the guest-access calls do (orangish-app lib/guest-access-rules.ts
// parseRequestBody/parseRedeemBody require both, and the platform refuses a club that is not
// the relay's), so the academy routes can reuse those parsers. The signed-in calls send
// exactly §3.3's shapes: the session names the club.
//
// THE PARTNER NEVER COMES FROM HERE. Nothing this module sends names a partner, a price, a
// title or a hirer; the platform takes the partner from the session (§3.2) and computes
// every amount (D7). The write's body is §3.3's seven keys and nothing else.

import { TOKEN_RE } from './session'
import { REQUEST_ID_RE, type AddBody } from './pick'
import { toAddView, toDay, toOverview, ymdOf, type AcademyRedeemRefusal, type AddView, type DayResult, type OverviewView } from './view'
import { UUID_RE } from '../my-bookings/guard'

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')
// The platform's locations.slug for Exton — NOT a town name (lib/my-bookings/platform.ts).
const CLUB = process.env.EXTON_CLUB_SLUG || 'exton-sports'
const SCOPE = 'academy'
const BASE = '/api/public/academy'

/** Header names: the same contract as /my-bookings (orangish-app GA_CLUB relay headers). */
export const RELAY_SECRET_HEADER = 'x-exton-relay-secret'
export const CLIENT_IP_HEADER = 'x-exton-client-ip'

const SECRET_RE = /^[\x21-\x7e]{32,256}$/
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

function post(secret: string, ip: string, path: string, body: unknown, ms: number, token?: string): Promise<Response> {
  return fetch(`${API_BASE}${BASE}${path}`, {
    method: 'POST',
    headers: headersFor(secret, ip, token, true),
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(ms),
  })
}

function get(secret: string, ip: string, path: string, ms: number, token: string): Promise<Response> {
  return fetch(`${API_BASE}${BASE}${path}`, {
    headers: headersFor(secret, ip, token),
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

const bearer = (token: unknown): token is string => typeof token === 'string' && TOKEN_RE.test(token)

/**
 * "Email me a link" (§3.3 POST /request). 'ok' covers the 202 the platform gives EVERY
 * well-formed address — allow-listed or decoy, sent or held back (D1) — and any 429 other
 * than the club-wide 'busy', so no limit becomes a signal about one address. 'busy' is the
 * same for everyone and is said honestly ('try_again'). 404 is the page switched off at the
 * club (D3), which says nothing about any address either. 10 s.
 */
export async function requestAcademyLink(email: string, ip: string): Promise<'ok' | 'bad_email' | 'off' | 'try_again'> {
  const secret = relaySecret()
  if (!secret) return 'try_again'
  try {
    const res = await post(secret, ip, '/request', { club: CLUB, scope: SCOPE, email }, 10_000)
    if (res.status === 202 || res.status === 200) return 'ok'
    if (res.status === 429) return errorOf(await jsonOf(res)) === 'busy' ? 'try_again' : 'ok'
    if (res.status === 400 && errorOf(await jsonOf(res)) === 'bad_email') return 'bad_email'
    if (res.status === 404) return 'off'
    return 'try_again'
  } catch {
    return 'try_again'
  }
}

export type AcademyRedeemResult =
  | { ok: true; deviceToken: string; expiresAt: string }
  | { ok: false; error: AcademyRedeemRefusal }

/**
 * A link token or an email + code → a device token (§3.3 POST /redeem). Every refusal the
 * platform makes is ONE 400 'invalid'; only that answer spends the parked link
 * (view.ts academyRedeemRefusal). A 200 whose token or date is not the right shape is
 * 'try_again', not success: no cookie is set from a value this site cannot vouch for.
 */
export async function redeemAcademy(
  input: { link: string } | { email: string; code: string },
  ip: string,
): Promise<AcademyRedeemResult> {
  const secret = relaySecret()
  if (!secret) return { ok: false, error: 'try_again' }
  try {
    const res = await post(secret, ip, '/redeem', { club: CLUB, scope: SCOPE, ...input }, 10_000)
    if (res.status === 429) return { ok: false, error: 'slow_down' }
    if (res.status === 404) return { ok: false, error: 'off' }
    if (res.status === 400) return { ok: false, error: errorOf(await jsonOf(res)) === 'invalid' ? 'invalid' : 'try_again' }
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

export type OverviewResult =
  | { kind: 'ok'; view: OverviewView }
  | { kind: 'signed_out' }
  | { kind: 'off' }
  | { kind: 'unavailable' }

/**
 * The signed-in page (§3.3 GET /overview). Only a 401 is signed out and only a 404 is "not
 * available"; anything else that is not a clean, allow-listed 200 — a 503, a timeout, no
 * relay secret — is 'unavailable', which the page says plainly. NEVER an empty page. 5 s.
 */
export async function academyOverview(token: string, ip: string): Promise<OverviewResult> {
  const secret = relaySecret()
  if (!secret) return { kind: 'unavailable' }
  if (!bearer(token)) return { kind: 'signed_out' }
  try {
    const res = await get(secret, ip, '/overview', 5_000, token)
    if (res.status === 401) return { kind: 'signed_out' }
    if (res.status === 404) return { kind: 'off' }
    if (res.status !== 200) return { kind: 'unavailable' }
    const view = toOverview(await jsonOf(res))
    return view ? { kind: 'ok', view } : { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

/**
 * One day's court × half-hour grid (§3.3 GET /day). Same mapping as the overview, plus one: the
 * platform's 422 {reason:'window'} is 'stale' — a date outside today … today + 14, which the
 * page's own chips only ask for once it has sat open past midnight (view.ts DayResult). Any
 * other 422 says nothing this page can act on and is 'unavailable'. 5 s.
 */
export async function academyDay(token: string, date: string, ip: string): Promise<DayResult> {
  const secret = relaySecret()
  if (!secret || !ymdOf(date)) return { status: 'unavailable' }
  if (!bearer(token)) return { status: 'signed_out' }
  try {
    const res = await get(secret, ip, `/day?${new URLSearchParams({ date })}`, 5_000, token)
    if (res.status === 401) return { status: 'signed_out' }
    if (res.status === 404) return { status: 'off' }
    if (res.status === 422) {
      const j = await jsonOf(res)
      return j && typeof j === 'object' && (j as { reason?: unknown }).reason === 'window' ? { status: 'stale' } : { status: 'unavailable' }
    }
    if (res.status !== 200) return { status: 'unavailable' }
    const day = toDay(await jsonOf(res), date)
    return day ? { status: 'ok', day } : { status: 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}

/** The body this module will send, re-checked key by key; null → nothing is sent. */
function sendableAdd(b: AddBody): AddBody | null {
  if (!b || typeof b !== 'object') return null
  if (typeof b.requestId !== 'string' || !REQUEST_ID_RE.test(b.requestId)) return null
  if (b.kind !== 'extend' && b.kind !== 'book') return null
  // A booking starts on :00 or :30 (D5); an extension starts exactly where its session ends
  // (D4), which the platform checks against the session itself.
  const startRe = b.kind === 'book' ? /^([01]\d|2[0-3]):(00|30)$/ : /^([01]\d|2[0-3]):[0-5]\d$/
  if (!ymdOf(b.date) || typeof b.start !== 'string' || !startRe.test(b.start)) return null
  const okMinutes = b.kind === 'extend' ? [30, 60] : [30, 60, 90, 120]
  if (!okMinutes.includes(b.minutes)) return null
  if (!Array.isArray(b.courtIds) || b.courtIds.length < 1 || b.courtIds.length > 3) return null
  if (b.courtIds.some((c) => typeof c !== 'string' || !UUID_RE.test(c)) || new Set(b.courtIds).size !== b.courtIds.length) return null
  if (b.use !== undefined && b.use !== 'coaching' && b.use !== 'open_play') return null
  const out: AddBody = { requestId: b.requestId, kind: b.kind, date: b.date, start: b.start, minutes: b.minutes, courtIds: [...b.courtIds] }
  if (b.use) out.use = b.use
  return out
}

/**
 * THE ONE WRITE (§3.3 POST /add): extend or book, on account. 25 s — the platform writes
 * each court and sends the email inside this call; the route's maxDuration is 30.
 *
 * A timeout, a 503, or a 200 that fails the allow-list is 'unknown' (view.ts toAddView),
 * never "nothing happened": the page then keeps the request id, so pressing again replays
 * the first answer instead of adding the time twice. With no relay secret, or a body this
 * module would not send, nothing is sent — 'bad_request', the truth.
 */
export async function academyAdd(body: AddBody, token: string, ip: string): Promise<AddView> {
  const secret = relaySecret()
  if (!secret) return { status: 'bad_request' }
  if (!bearer(token)) return { status: 'signed_out' }
  const send = sendableAdd(body)
  if (!send) return { status: 'bad_request' }
  try {
    const res = await post(secret, ip, '/add', send, 25_000, token)
    return toAddView(res.status, await jsonOf(res))
  } catch {
    return toAddView(0, null)
  }
}

/** Revoke this phone's session upstream. Best effort: the cookie is cleared regardless. */
export async function academySignOut(token: string, ip: string): Promise<void> {
  const secret = relaySecret()
  if (!secret || !bearer(token)) return
  try {
    await post(secret, ip, '/sign-out', {}, 5_000, token)
  } catch {
    /* the cookie is already gone; an unrevoked row expires on its own */
  }
}
