/* The waiver signing link's mailing-list box: the platform's server tells us, we add a NEW
   address and touch nothing else.
   ──────────────────────────────────────────────────────────────────────────────────────
   2026-11-15. The platform (orangish-app) sends each person a waiver link of their own; the
   page has an "Add me to the Exton Sports mailing list" box, ticked by default. When a signer
   leaves it ticked, the platform's SERVER posts here (server/route.ts). This file decides
   everything, so node:test can pin it (server-core.test.mjs).

   THE CONTRACT (the platform's caller must match it exactly):
     POST https://www.extonsports.com/api/mailing-list-optin/server
       Authorization: Bearer <EXTON_OPTIN_SECRET>      Content-Type: application/json
       {"email": string, "source": "waiver-link"}
     200 {"ok":true}                 any well-formed email, on the list or not (never reveal)
     401 {"error":"unauthorized"}    missing or wrong secret
     400 {"error":...}               not JSON, not an address, or a source other than waiver-link
     429 {"error":...}               more than SERVER_LIMIT in a minute, all callers together
     503 {"error":"not configured"}  EXTON_OPTIN_SECRET is not set on this site
   www, not the apex: extonsports.com answers every path with a 308 to www (next.config.ts),
   and fetch drops Authorization on a redirect to another host, so an apex URL gets a 401.

   THE RULE is the popup's, unchanged and shared (../optin-core.ts addIfNew): look for the
   address in ANY state, and if the property has ever had it, do nothing at all; never
   re-subscribe an unsubscribed address. A box ticked by default is the weakest consent there
   is, on the waiver page as much as in the popup. A new address gets the same welcome and
   staff notice, with subscribers.source = 'waiver-link'.

   No geo: the request comes from the platform's server, so Vercel's geo headers would place
   the signer wherever that server runs. The row and the notice carry none rather than a
   wrong one. */

import { createHash, timingSafeEqual } from 'node:crypto'
import { isEmailShaped } from '../../../components/my-bookings-pure'
import {
  addIfNew, createRateLimiter,
  type Geo, type OptinDeps, type OptinOrigin, type OptinReply,
} from '../optin-core'

/** subscribers.source for a row made here, and the only `source` the caller may send. */
export const WAIVER_SOURCE = 'waiver-link'
export const WAIVER_ORIGIN: OptinOrigin = { source: WAIVER_SOURCE, notice: 'waiver' }

/** One caller, so no per-IP limit; a total per minute instead, per serverless instance like
 *  the popup's. 30 is far above any real minute of waiver signing at one club, and low
 *  enough that a leaked secret cannot flood the staff inbox (2026-11-15). */
export const SERVER_LIMIT = 30
export const SERVER_WINDOW_MS = 60_000

export type ServerOptinDeps = Omit<OptinDeps, 'allow'> & {
  /** EXTON_OPTIN_SECRET, read per request; unset or blank means "not configured". */
  secret(): string | undefined
  /** The total-per-minute cap: true when this request is allowed. */
  allow(): boolean
}

const NO_GEO: Geo = { country: null, region: null, city: null }
const OK = { status: 200, body: { ok: true } } as const

/** A total cap, not per key: createRateLimiter with one key for everyone. */
export function createTotalCap(limit: number, windowMs: number, now: () => number = Date.now): () => boolean {
  const allow = createRateLimiter(limit, windowMs, now)
  return () => allow('all')
}

/** Constant-time: both sides are hashed first, so neither the length nor the first wrong
 *  byte of the secret shows in the time taken. */
export function secretMatches(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given, 'utf8').digest()
  const b = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(a, b)
}

function bearer(headers: Headers): string {
  const m = /^Bearer[ \t]+(.+)$/i.exec(headers.get('authorization') || '')
  return m ? m[1]!.trim() : ''
}

/** Check, then answer. The work is returned, not run: server/route.ts hands it to after(). */
export async function handleServerOptin(
  req: { headers: Headers; json(): Promise<unknown> },
  deps: ServerOptinDeps,
): Promise<OptinReply> {
  const secret = (deps.secret() ?? '').trim()
  if (!secret) {
    deps.log('[mailing-list-optin/server] EXTON_OPTIN_SECRET is not set; refused')
    return { status: 503, body: { error: 'not configured' }, work: null }
  }
  const given = bearer(req.headers)
  if (!given || !secretMatches(given, secret)) {
    return { status: 401, body: { error: 'unauthorized' }, work: null }
  }
  // After the secret, so nobody without it can use up the platform's allowance.
  if (!deps.allow()) {
    return { status: 429, body: { error: 'Too many requests. Please try again shortly.' }, work: null }
  }

  let body: unknown
  try { body = await req.json() } catch {
    return { status: 400, body: { error: 'Invalid JSON' }, work: null }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, body: { error: 'Invalid JSON' }, work: null }
  }
  const b = body as Record<string, unknown>
  // The popup's address check, so the two routes never disagree on what is an address.
  if (!isEmailShaped(b.email)) return { status: 400, body: { error: 'Valid email required.' }, work: null }
  // One known source. The row's source is still ours (WAIVER_ORIGIN), never the caller's
  // string; this only refuses a caller that means something else.
  if (b.source !== WAIVER_SOURCE) return { status: 400, body: { error: 'Unknown source.' }, work: null }

  // Trimmed and lower-cased, as optin-core stores every address.
  const email = (b.email as string).trim().toLowerCase()
  return { ...OK, work: () => addIfNew(email, NO_GEO, deps, WAIVER_ORIGIN) }
}
