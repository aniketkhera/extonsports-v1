// The day pass for extonsports.com/live. PURE, so the rules can be read by a test.
// 2026-11-09, Aniket's decision: "a new link every day".
//
// WHY A SIGNED TOKEN AND NOT A DATABASE ROW. The only thing a watch link has to carry is
// "this address asked, on this day". A row would add a table, a write on every request, a
// reaper, and a second place for a parent's address to live. An HMAC carries the same two
// facts, expires by arithmetic rather than by a cron, and cannot be forged without the key.
// The cost is that a single link cannot be revoked before the day ends — see REVOCATION.
//
// WHY THE DAY IS THE CLUB'S DAY, NOT UTC. A 9:00 pm class in Exton is already tomorrow in
// UTC, so a UTC day would hand a parent a token that expired three hours into the evening
// session. Every date here is computed in America/New_York.
//
// WHAT THIS DOES NOT DO. It does not stop a parent forwarding their link to a grandparent,
// and it is not meant to: the link is good until midnight at the club and then it is dead,
// and the YouTube broadcast behind it is a different video every day. That is the whole
// control. Anything stronger needs per-viewer streams, which needs our own relay.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const CLUB_TZ = 'America/New_York'

/** The club's calendar date for an instant, as YYYY-MM-DD. */
export function clubDay(at: Date = new Date(), timeZone: string = CLUB_TZ): string {
  // en-CA gives YYYY-MM-DD, which sorts and compares as a string.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/** Addresses are compared and hashed lower-cased and trimmed, never stored in the link. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

function b64url(b: Buffer): string {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sign(payload: string, key: string): string {
  return b64url(createHmac('sha256', key).update(payload).digest())
}

/**
 * A day pass. The address is HASHED into the token, never carried in it: the link ends up in
 * an inbox, a browser history and our own logs, and none of those needs a parent's address
 * in the clear. The hash is keyed, so it is not a lookup table for addresses either.
 */
export function mintToken(email: string, key: string, day: string = clubDay()): string {
  if (!key) throw new Error('mintToken: no key')
  const who = sign('who:' + normaliseEmail(email), key).slice(0, 16)
  const payload = `1.${day}.${who}`
  return `${payload}.${sign(payload, key).slice(0, 27)}`
}

export type TokenCheck =
  | { ok: true; day: string; who: string }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

/**
 * Verify a day pass. Order matters: the signature is checked BEFORE the date, so a forged
 * token is never told whether its date would have been acceptable.
 */
export function readToken(token: string, key: string, today: string = clubDay()): TokenCheck {
  if (!key) return { ok: false, reason: 'malformed' }
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 4) return { ok: false, reason: 'malformed' }
  const [v, day, who, mac] = parts
  if (v !== '1') return { ok: false, reason: 'malformed' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, reason: 'malformed' }
  if (!/^[A-Za-z0-9_-]{16}$/.test(who)) return { ok: false, reason: 'malformed' }
  if (!/^[A-Za-z0-9_-]{27}$/.test(mac)) return { ok: false, reason: 'malformed' }

  const want = sign(`1.${day}.${who}`, key).slice(0, 27)
  const a = Buffer.from(mac)
  const b = Buffer.from(want)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' }

  // Exactly today at the club. Not "within 24 hours": a link minted at 11:58 pm is good for
  // two minutes, which is correct — the broadcast it points at ends with the day too.
  if (day !== today) return { ok: false, reason: 'expired' }

  return { ok: true, day, who }
}

/** The link we email. Nothing else may build this string. */
export function watchUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/live/${token}`
}

// REVOCATION. There is none inside a day, by design. To cut a link off early, the owner ends
// the YouTube broadcast: every page then shows "no class on air", because the page renders
// whatever liveBroadcasts says and nothing else. That is the fire alarm, and it is one click
// in YouTube Studio rather than a feature we have to build and then trust.
