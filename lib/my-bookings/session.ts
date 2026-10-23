// The first-party cookies behind extonsports.com/my-bookings, 2026-10-20 — two for
// signing in, and since 2026-10-21 a third that parks a court pack booking's slot
// (PACK_SEL_COOKIE, at the end of this file).
//
// WHY COOKIES ON THIS SITE, NOT THE PLATFORM'S: the owner's rule for this path (2026-10-18,
// "i want to stay away from the orangish-app") is that a guest sees extonsports.com only,
// and Safari/iOS block third-party cookies outright. So the remembered-device token lives
// HERE, httpOnly, set by this site's own route handlers, and the site's server routes hand
// it to the platform server-to-server as a bearer header (lib/my-bookings/platform.ts). The
// platform stores only its sha256; the raw value exists in this cookie and nowhere else.
//
// PURE: no next/* import, so node:test can load it straight off the .ts source
// (lib/my-bookings/my-bookings.test.mjs). The cookies() reads are in ./session-server.ts.
//
// `__Host-` PREFIX: the browser then refuses the cookie unless it is Secure, Path=/ and
// carries NO Domain — i.e. host-only on www.extonsports.com (the apex 308s to www,
// next.config.ts), so no sibling subdomain can read or plant it. Chrome accepts Secure on
// http://localhost, which is what `next dev` serves; Safari in dev will not, and that is
// accepted rather than weakening the production cookie.
//
// SameSite=Lax, NOT Strict: the landing is a cross-site click from a mail app, and Strict
// would arrive without the cookie. Lax still withholds it from every cross-site POST,
// iframe and fetch, which is the CSRF layer that matters (lib/my-bookings/guard.ts is the
// second). Set by the SERVER, so Safari's 7-day cap on script-written cookies does not
// apply — the 90 days the platform grants are the 90 days the device keeps.

import { UUID_RE } from './guard'

export const DEVICE_COOKIE = '__Host-exton_mb' // raw device token; the platform stores only sha256
export const LINK_COOKIE = '__Host-exton_mb_link' // raw link token, parked between /link and /open
export const DEVICE_MAX_AGE_S = 90 * 24 * 3600
// 30 minutes from the CLICK. The platform's link lives 30 minutes from the email (2 hours
// once an address is past its day's budget), and still refuses an expired one itself.
export const LINK_MAX_AGE_S = 1800

/** 32 random bytes, base64url, no padding — the platform's mintPayToken shape. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export type CookieOpts = {
  httpOnly: true
  secure: true
  sameSite: 'lax'
  path: '/'
  maxAge: number
}
export type CookieSpec = { name: string; value: string; options: CookieOpts }

function opts(maxAge: number): CookieOpts {
  // NO `domain` key, deliberately — see __Host- above. Adding one makes the browser drop
  // the cookie silently, which would read as "signed out" on every visit.
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge }
}

/**
 * The remembered-device cookie. Its life is the PLATFORM's session expiry, not a number
 * of our own: a cookie that outlived its session would only produce "signed out" later.
 * A bad or missing date THROWS rather than falling back to 90 days — the caller then
 * answers try_again, and no cookie is set that the platform did not vouch for.
 */
export function deviceCookie(token: string, expiresAtIso: string, now = Date.now()): CookieSpec {
  if (!TOKEN_RE.test(token)) throw new Error('deviceCookie: token shape')
  const at = Date.parse(expiresAtIso)
  if (typeof expiresAtIso !== 'string' || !Number.isFinite(at)) throw new Error('deviceCookie: expiresAt')
  const maxAge = Math.min(Math.max(Math.floor((at - now) / 1000), 0), DEVICE_MAX_AGE_S)
  return { name: DEVICE_COOKIE, value: token, options: opts(maxAge) }
}

/** The single-use link token, parked by GET /my-bookings/link until the guest presses Open. */
export function linkCookie(token: string): CookieSpec {
  if (!TOKEN_RE.test(token)) throw new Error('linkCookie: token shape')
  return { name: LINK_COOKIE, value: token, options: opts(LINK_MAX_AGE_S) }
}

/**
 * After a new sign-in on this browser, the device token it replaces — to revoke upstream —
 * or null. Second review, 2026-10-20: the new cookie overwrites the old one, so without the
 * revoke the old session stays live for up to 90 days with nobody holding it, and the
 * platform keeps only five live sessions per guest — repeat sign-ins on one phone would
 * sign the guest's OTHER devices out instead. On a shared device it also ends the previous
 * person's session upstream.
 */
export function replacedToken(previous: string | null, next: string): string | null {
  return previous && previous !== next ? previous : null
}

/**
 * An expiring overwrite. Same attributes as the original — a __Host- cookie can only be
 * replaced by a Set-Cookie that is itself Secure, Path=/ and domainless.
 */
export function clearedCookie(name: string): { name: string; value: ''; options: CookieOpts & { maxAge: 0 } } {
  return { name, value: '', options: { ...opts(0), maxAge: 0 } }
}

/* ── The court pack (2026-10-21) ─────────────────────────────────────────────────────
   Owner, 2026-10-20: "let's go with the implentation.." — orangish-app docs/court-packs.md
   §8.1. The guest picks a slot on the app's booking form and presses "Continue with my
   court pack"; the form sends them to GET /my-bookings/pack/start?s&d&t&h&n&c, which parks
   the slot HERE and 303s to /my-bookings/pack. Why a cookie and not the query string: the
   pack page signs a guest in by code (it may reload, or come back through an emailed
   link to /my-bookings/open), and the slot has to survive that without ever riding in an
   email. Why this site: the remembered device is __Host-exton_mb, which app.orangish.io
   cannot read (§0).

   ⛔ THE SLOT ONLY. Six keys, each shape-checked, and nothing that names a person: the
   parser below reads s, d, t, h, n and c and NOTHING else, so a link that carries the
   guest's address (or anything else) cannot put it in a cookie. The platform re-checks
   the slot itself on every quote and book (resolveGuestSlot, then ch_create_guest_booking
   in SQL); these checks only keep junk out. */

/** The parked slot: base64url JSON, httpOnly, 30 minutes (design §8.1). */
export const PACK_SEL_COOKIE = '__Host-exton_pack_sel'
export const PACK_SEL_MAX_AGE_S = 1800

/** 16 random bytes, base64url, no padding: the platform's court_pack_redemptions.request_key. */
export const REQUEST_KEY_RE = /^[A-Za-z0-9_-]{22}$/
/** A Stripe Checkout Session id, the only thing /my-bookings/pack/ready?cs= may relay. */
export const CHECKOUT_SESSION_RE = /^cs_(live|test)_[A-Za-z0-9]{1,250}$/

/**
 * The slot, in the platform's `sel` shape (orangish-app lib/guest-court-slot.ts
 * resolveGuestSlot; parseGuestRequest's field names), so the relay sends it as it is.
 */
export type PackSelection = {
  sportId: string
  date: string // YYYY-MM-DD, club-local
  startTime: string // HH:MM
  hours: number // 1–3, Exton's maximum
  courts: number // 1–4, the platform's GUEST_MAX_COURTS
  preferCourtId: string | null
}

const SEL_KEYS = ['s', 'd', 't', 'h', 'n', 'c'] as const
type SelKey = (typeof SEL_KEYS)[number]
const SEL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const SEL_VALUE_RE = /^[A-Za-z0-9_-]{1,400}$/

function realDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  // '2026-02-30' would otherwise roll silently into March (the platform's own check).
  const probe = new Date(`${v}T12:00:00Z`)
  return !Number.isNaN(probe.getTime()) && probe.toISOString().slice(0, 10) === v
}

/** One digit, lo–hi: "2" from a query string or 2 from the cookie. "02", "1.5" are not. */
function digit(v: unknown, lo: number, hi: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d$/.test(v) ? Number(v) : NaN
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null
}

/** The one shape check, for the query string and the cookie alike. */
function selectionOf(raw: Partial<Record<SelKey, unknown>>): PackSelection | null {
  const { s, d, t, h, n, c } = raw
  if (typeof s !== 'string' || !UUID_RE.test(s)) return null
  if (!realDate(d)) return null
  if (typeof t !== 'string' || !SEL_TIME_RE.test(t)) return null
  const hours = digit(h, 1, 3)
  const courts = digit(n, 1, 4)
  if (hours === null || courts === null) return null
  // The app adds &c= only when the guest picked a court; an empty one is no court.
  let preferCourtId: string | null = null
  if (c !== undefined && c !== null && c !== '') {
    if (typeof c !== 'string' || !UUID_RE.test(c)) return null
    preferCourtId = c
  }
  return { sportId: s, date: d, startTime: t, hours, courts, preferCourtId }
}

/**
 * GET /my-bookings/pack/start's query string → the slot, or null ("Pick a time first").
 * Reads the six keys by name and ignores every other one. A key given twice is null: two
 * values for one slot means the link was not built by the app.
 */
export function parsePackSelection(params: URLSearchParams): PackSelection | null {
  const raw: Partial<Record<SelKey, unknown>> = {}
  for (const k of SEL_KEYS) {
    const all = params.getAll(k)
    if (all.length > 1) return null
    if (all.length === 1) raw[k] = all[0]
  }
  return selectionOf(raw)
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64url(s: string): string | null {
  try {
    const b = s.replace(/-/g, '+').replace(/_/g, '/')
    return atob(b + '='.repeat((4 - (b.length % 4)) % 4))
  } catch {
    return null
  }
}

/** The compact form the cookie holds: the six short keys, c only when there is one. */
function compact(sel: PackSelection): Partial<Record<SelKey, string | number>> {
  const o: Partial<Record<SelKey, string | number>> = {
    s: sel.sportId, d: sel.date, t: sel.startTime, h: sel.hours, n: sel.courts,
  }
  if (sel.preferCourtId) o.c = sel.preferCourtId
  return o
}

/**
 * The parked-slot cookie. THROWS on a selection that would not parse back — the caller
 * (the start route) only ever passes parsePackSelection's own output, so a throw is a bug,
 * and no cookie is better than one the page would read as "Pick a time first".
 */
export function packSelCookie(sel: PackSelection): CookieSpec {
  const o = sel ? compact(sel) : null
  if (!o || !selectionOf(o)) throw new Error('packSelCookie: selection shape')
  return { name: PACK_SEL_COOKIE, value: b64url(JSON.stringify(o)), options: opts(PACK_SEL_MAX_AGE_S) }
}

/**
 * The cookie's value → the slot, or null. httpOnly stops page scripts, not the guest's own
 * browser, so the value is re-checked by the same rules as the query string, and a key
 * the start route never writes makes the whole cookie null.
 */
export function decodePackSel(value: string | null | undefined): PackSelection | null {
  if (typeof value !== 'string' || !SEL_VALUE_RE.test(value)) return null
  const text = unb64url(value)
  if (text === null) return null
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const keys = Object.keys(raw)
  if (keys.some((k) => !(SEL_KEYS as readonly string[]).includes(k))) return null
  return selectionOf(raw as Partial<Record<SelKey, unknown>>)
}

/**
 * The idempotency key a pack booking carries (design §6.2): minted once per page render
 * by /my-bookings/pack, so pressing Book twice, or retrying after a timeout, books once.
 * Not a secret — the platform keys it per holder — but random, so two tabs never collide.
 */
export function mintRequestKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return b64url(String.fromCharCode(...bytes))
}

/**
 * Where a sign-in goes next (design §8.1): the pack page, when a slot is parked, or the
 * list. An allow-list, never a URL from a request, so no `next` can send a freshly
 * signed-in guest anywhere else. CodeForm, OpenButton and RequestPanel take one of these.
 *
 * Plus ONE shape (integration, 2026-10-21; S3's ask): the list with `?cancel=<seriesId>`,
 * the pack confirmation email's tokenless Cancel link (design §8.3). Without it a guest on
 * a phone that is not remembered signed in and lost the sheet the link was for. The id is
 * a UUID or the whole value is refused; it only OPENS that row's sheet on this device's
 * own list — the guest still presses Yes.
 */
export const NEXT_PATHS = ['/my-bookings', '/my-bookings/pack'] as const
export type CancelNextPath = `/my-bookings?cancel=${string}`
export type NextPath = (typeof NEXT_PATHS)[number] | CancelNextPath

const CANCEL_NEXT_RE = /^\/my-bookings\?cancel=([^&#=?/]+)$/

/** `/my-bookings?cancel=<id>` for a series id, or null for anything that is not a UUID. */
export function cancelNextPath(seriesId: unknown): CancelNextPath | null {
  return typeof seriesId === 'string' && UUID_RE.test(seriesId) ? `/my-bookings?cancel=${seriesId}` : null
}

export function nextPathOf(v: unknown): NextPath {
  const fixed = NEXT_PATHS.find((p) => p === v)
  if (fixed) return fixed
  const m = typeof v === 'string' ? CANCEL_NEXT_RE.exec(v) : null
  return (m && cancelNextPath(m[1])) || '/my-bookings'
}
