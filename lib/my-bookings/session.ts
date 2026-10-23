// The two first-party cookies behind extonsports.com/my-bookings, 2026-10-20.
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
