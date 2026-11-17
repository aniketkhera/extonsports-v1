// The first-party cookies behind extonsports.com/academies, 2026-11-16 (orangish-app
// docs/academy-page.md §4, D1) — the academy partners' page, PBA and CCCA only.
//
// THE SAME DESIGN AS /my-bookings, ON PURPOSE (lib/my-bookings/session.ts says why for each
// choice): the remembered-phone token lives HERE, httpOnly, set by this site's own route
// handlers, and goes to the platform server-to-server as a bearer (./platform.ts); the
// platform stores only its sha256. `__Host-` (Secure, Path=/, no Domain), SameSite=Lax
// (the landing is a cross-site click from a mail app), set by the SERVER so Safari's 7-day
// cap on script-written cookies does not apply.
//
// ⛔ OWN NAMES. A guest's My-bookings sign-in (__Host-exton_mb, __Host-exton_mb_link) and an
// academy's sign-in are different scopes on the platform ('guest_court_bookings' and
// 'academy') with different lives (90 days and 30), and one phone may hold both — Syam may
// book a court for himself as a guest. Sharing a cookie would sign one out to sign the
// other in, and send one scope's token to the other's endpoints. Nothing in lib/academies or
// app/academies names an __Host-exton_mb cookie (academies.test.mjs checks).
//
// 30 DAYS, NOT 90 (D1): this session can put charges on an account, and staff can revoke it
// (ga_session_revoke). The platform decides the expiry; the cookie never outlives it.
//
// PURE: no next/* import, so node:test loads it straight off the .ts source. The cookies()
// reads are in ./session-server.ts.

import { TOKEN_RE, clearedCookie, replacedToken, type CookieSpec } from '../my-bookings/session'

export { TOKEN_RE, clearedCookie, replacedToken, type CookieSpec }

export const ACADEMY_COOKIE = '__Host-exton_ac' // raw device token; the platform stores only sha256
export const ACADEMY_LINK_COOKIE = '__Host-exton_ac_link' // raw link token, parked between /link and /open
export const ACADEMY_MAX_AGE_S = 30 * 24 * 3600
// 30 minutes from the CLICK; the platform's link lives 30 minutes from the email and still
// refuses an expired one itself (as LINK_MAX_AGE_S for /my-bookings).
export const ACADEMY_LINK_MAX_AGE_S = 1800

function opts(maxAge: number): CookieSpec['options'] {
  // NO `domain` key — a __Host- cookie with one is dropped silently by the browser, which
  // would read as "signed out" on every visit.
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge }
}

/**
 * The remembered-phone cookie. Its life is the PLATFORM's session expiry, capped at 30 days:
 * a cookie that outlived its session would only produce "signed out" later. A bad or
 * missing date THROWS rather than falling back to 30 days — the caller answers try_again,
 * and no cookie is set that the platform did not vouch for (deviceCookie's rule).
 */
export function academyCookie(token: string, expiresAtIso: string, now = Date.now()): CookieSpec {
  if (!TOKEN_RE.test(token)) throw new Error('academyCookie: token shape')
  const at = Date.parse(expiresAtIso)
  if (typeof expiresAtIso !== 'string' || !Number.isFinite(at)) throw new Error('academyCookie: expiresAt')
  const maxAge = Math.min(Math.max(Math.floor((at - now) / 1000), 0), ACADEMY_MAX_AGE_S)
  return { name: ACADEMY_COOKIE, value: token, options: opts(maxAge) }
}

/** The single-use link token, parked by GET /academies/link until the partner presses Open. */
export function academyLinkCookie(token: string): CookieSpec {
  if (!TOKEN_RE.test(token)) throw new Error('academyLinkCookie: token shape')
  return { name: ACADEMY_LINK_COOKIE, value: token, options: opts(ACADEMY_LINK_MAX_AGE_S) }
}

/** Where every sign-in on this path lands. One fixed path: no `next` is ever read from a
 *  request, so no link can send a freshly signed-in phone anywhere else. */
export const ACADEMY_PATH = '/academies'
