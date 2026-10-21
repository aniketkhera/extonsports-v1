/* The mailing-list box in the "Email my bookings" popup: add a NEW address, touch nothing else.
   ──────────────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21: "also adda a checkbox, checked by default - add to our mailing list?"
   The popup (app/components/MyBookingsEmail.tsx) posts { email, website } here when the box
   is ticked; route.ts beside this file wires in the real database and email. Everything that
   decides anything is in this file so node:test can pin it (optin-core.test.mjs).

   ⛔ WHY NOT THE FOOTER'S ROUTE (/api/waitlist → mailer-admin createSubscribeRoute). A box
   that is ticked before anyone touches it is the weakest consent there is, so it may only
   ever ADD an address the list has never had. mailer-admin's subscribe route, on a repeat
   signup, clears unsubscribed_at; through a pre-ticked box that would re-subscribe someone
   who asked to leave, by default, without their noticing. mailer-admin is a shared package
   (a git dependency several sites build from), so changing it means a push and a version
   bump for every site; a route of Exton's own changes nothing anywhere else. It reuses the
   package's database client and email shell (route.ts); what it repeats is the footer's
   welcome lookup, which the package does not export. The staff notice is the shared one in
   lib/signup-notice.ts (2026-10-21), the same the footer sends.

   THE RULE: look for the address in ANY state (active or unsubscribed, any letter case,
   stray spaces around it), and if there is one, do nothing at all: no update, no welcome,
   no notify. Only an address with no row gets a row, with a plain INSERT, which can never
   modify an existing row; the unique key (property, email) turns a concurrent duplicate
   into an error, and an error sends nothing. Any doubt (a failed lookup, a full page of
   look-alikes) is "exists".

   ⛔ NEVER REVEAL. The answer is decided BEFORE the database is asked anything, and the work
   runs after the response (route.ts, after()), so neither the body nor the timing says
   whether an address was on the list. The popup ignores the answer anyway: the toast comes
   from the booking-list request alone. */

import type { MailerConfig } from 'mailer-admin/config'
import { isEmailShaped } from '../../components/my-bookings-pure'
import { sendSignupNotice, type NoticeDeps, type WelcomeStatus } from '../../../lib/signup-notice'

/** subscribers.source for a row made here. Set by the route, never read from the browser. */
export const OPTIN_SOURCE = 'my-bookings-popup'

/** mailer-admin's subscribe route allows 5 a minute per IP; so does this (2026-10-21). Its
 *  limiter is not exported, so this is the same fixed window, kept separately. */
export const OPTIN_LIMIT = 5
export const OPTIN_WINDOW_MS = 60_000

/** The popup's honeypot field, the same one it forwards to the booking-list request. */
export const HONEYPOT_FIELD = 'website'

/** Rows the lookup reads before giving up and calling it "exists" (see likePattern). */
export const LOOKUP_LIMIT = 100

export type OptinSite = Pick<MailerConfig, 'property' | 'brandName' | 'notifyEmail' | 'welcomeEmails'>

/** The two calls this route may make. No update, no delete: it cannot change a row. */
export type OptinDb = {
  configured(): boolean
  selectRows<T>(table: string, opts: { select: string; filters: Record<string, string>; limit: number }): Promise<T[]>
  insertRow<T>(table: string, row: Record<string, unknown>): Promise<T | null>
}

export type OptinMail = {
  send(a: { to: string | string[]; subject: string; html: string }): Promise<void>
  /** The footer's welcome, through mailer-admin's shell, with this row's unsubscribe link. */
  welcomeHtml(a: { subject: string; bodyMd: string; token: string }): string
}

export type OptinDeps = {
  site: OptinSite
  db: OptinDb
  mail: OptinMail
  /** The per-IP limiter: true when this request is allowed. */
  allow(ip: string): boolean
  /** Server log. Never given an address. */
  log(message: string): void
  /** The staff "new signup" notice (lib/signup-notice.ts): its brand, count and sender. */
  notice: NoticeDeps
  /** The clock the notice's "When" is read from. Default: now. */
  now?: () => Date
}

export type OptinResult = 'added' | 'exists' | 'skipped' | 'error'

export type OptinReply = {
  status: number
  body: Record<string, unknown>
  /** The database and email work, run after the response; null when there is none. */
  work: (() => Promise<OptinResult>) | null
}

type Geo = { country: string | null; region: string | null; city: string | null }

const ACCEPTED = { status: 202, body: { success: true } } as const

/** Fixed window per key, in memory. Like mailer-admin's: a speed bump per serverless
 *  instance, not a guarantee across instances. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now): (key: string) => boolean {
  const buckets = new Map<string, { count: number; resetAt: number }>()
  return (key) => {
    const t = now()
    const b = buckets.get(key)
    if (!b || t >= b.resetAt) {
      if (buckets.size > 5000) for (const [k, v] of buckets) if (t >= v.resetAt) buckets.delete(k)
      buckets.set(key, { count: 1, resetAt: t + windowMs })
      return true
    }
    if (b.count >= limit) return false
    b.count++
    return true
  }
}

/** mailer-admin's clientIp, on a plain Headers. */
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip') || 'unknown'
}

function header(headers: Headers, name: string): string | null {
  const v = headers.get(name)
  if (!v) return null
  try { return decodeURIComponent(v) } catch { return null }
}

/** Vercel's geo headers, as the footer records them; null in local dev. */
export function geoFrom(headers: Headers): Geo {
  return {
    country: headers.get('x-vercel-ip-country') || null,
    region: header(headers, 'x-vercel-ip-country-region'),
    city: header(headers, 'x-vercel-ip-city'),
  }
}

/** The address as an ILIKE pattern that can only match MORE, never less. `%` and `*`
 *  (PostgREST's alias for `%`) are legal in an address and would widen the match to
 *  anything; `_` matches any one character, itself included. So each becomes `_`, and the
 *  rows that come back are compared exactly. The lookup also wraps it in `*…*` (addIfNew),
 *  so a stored value with anything either side of the address is found too. */
export function likePattern(email: string): string {
  return email.replace(/[%_*\\]/g, '_')
}

const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

/** Validate, then answer. The work is returned, not run: route.ts hands it to after(). */
export async function handleOptin(
  req: { headers: Headers; json(): Promise<unknown> },
  deps: OptinDeps,
): Promise<OptinReply> {
  if (!deps.allow(clientIp(req.headers))) {
    return { status: 429, body: { error: 'Too many requests. Please try again shortly.' }, work: null }
  }
  // JSON only: a text/plain or form POST is a "simple" request any page could fire from a
  // visitor's browser; JSON from another origin needs a preflight this route never answers.
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) {
    return { status: 415, body: { error: 'Send JSON.' }, work: null }
  }
  let body: unknown
  try { body = await req.json() } catch {
    return { status: 400, body: { error: 'Invalid JSON' }, work: null }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, body: { error: 'Invalid JSON' }, work: null }
  }
  const b = body as Record<string, unknown>

  // A filled honeypot is a bot: the same answer, and nothing done.
  const trap = b[HONEYPOT_FIELD]
  if (typeof trap === 'string' && trap.trim()) return { ...ACCEPTED, work: null }

  // The popup's own check (the platform's pattern), so the two never disagree.
  if (!isEmailShaped(b.email)) return { status: 400, body: { error: 'Valid email required.' }, work: null }
  const email = norm(b.email)
  const geo = geoFrom(req.headers)

  return { ...ACCEPTED, work: () => addIfNew(email, geo, deps) }
}

/** Add `email` only if this property has never had it. See THE RULE at the top. */
async function addIfNew(email: string, geo: Geo, deps: OptinDeps): Promise<OptinResult> {
  const { site, db, log } = deps
  if (!db.configured()) {
    log('[mailing-list-optin] mailer database not configured; nothing done')
    return 'skipped'
  }

  let onList: boolean
  try {
    onList = await addressOnList(db, site.property, email)
  } catch (e) {
    log(`[mailing-list-optin] lookup failed, nothing added: ${errText(e)}`)
    return 'error'
  }
  if (onList) return 'exists'

  let token: string | null = null
  try {
    const row = await db.insertRow<{ unsubscribe_token?: string | null }>('subscribers', {
      property: site.property,
      email,
      source: OPTIN_SOURCE,
      country: geo.country,
      region: geo.region,
      city: geo.city,
    })
    token = row?.unsubscribe_token || null
  } catch (e) {
    // Most likely a concurrent signup of the same address won (unique key). Either way the
    // row that exists is not ours to touch, and nobody is emailed.
    log(`[mailing-list-optin] insert refused, nothing sent: ${errText(e)}`)
    return 'error'
  }

  // The welcome first, so the staff notice can say truthfully whether it went out.
  const welcome = await sendWelcome(email, token, deps)
  await sendSignupNotice(
    site.notifyEmail,
    { email, source: 'popup', welcome, at: deps.now ? deps.now() : new Date(), geo },
    deps.notice,
  )
  return 'added'
}

/** Is `email` on this property's list in ANY state (active or unsubscribed, any case,
 *  spaces either side)? Throws if the lookup fails; the caller treats that as doubt.
 *  Shared with the footer's notice (app/api/waitlist/footer-notice.ts, 2026-10-21), so the
 *  two agree on who is "new".
 *
 *  `*address*`, not `address` (review, 2026-10-21): a row typed in by hand as
 *  " priya@x.com", or with a pasted tab or newline, does not equal the address, so a
 *  whole-value match missed it and an UNSUBSCRIBED person was added and emailed again.
 *  Every writer trims today; this is for the rows that did not come through one. Wider is
 *  safe: what comes back is trimmed and compared exactly, and a full page counts as
 *  "on the list", so a look-alike can only ever stop an insert, never cause one. */
export async function addressOnList(db: Pick<OptinDb, 'selectRows'>, property: string, email: string): Promise<boolean> {
  const address = norm(email)
  const found = await db.selectRows<{ email: string | null }>('subscribers', {
    select: 'email',
    filters: { property: `eq.${property}`, email: `ilike.*${likePattern(address)}*` },
    limit: LOOKUP_LIMIT,
  })
  return found.length >= LOOKUP_LIMIT || found.some((r) => norm(r.email) === address)
}

/** mailer-admin's sendWelcomeIfEnabled, which it does not export: the property's
 *  welcome_emails row, if switched on and not blank. One difference, on purpose: no token,
 *  no welcome, rather than an email whose unsubscribe link is "#". Returns what happened,
 *  for the staff notice: 'off' only when it is switched off; anything that stopped an
 *  email that should have gone (no token, a failed lookup, a failed send) is 'failed'. */
async function sendWelcome(email: string, token: string | null, deps: OptinDeps): Promise<WelcomeStatus> {
  const { site, db, mail, log } = deps
  if (site.welcomeEmails === false) return 'off'
  if (!token) {
    log('[mailing-list-optin] new row has no unsubscribe token; welcome not sent')
    return 'failed'
  }
  try {
    const [w] = await db.selectRows<{ subject: string | null; body_md: string | null; enabled: boolean | null }>(
      'welcome_emails',
      { select: 'subject,body_md,enabled', filters: { property: `eq.${site.property}` }, limit: 1 },
    )
    if (!w || !w.enabled || !w.subject?.trim() || !w.body_md?.trim()) return 'off'
    await mail.send({ to: email, subject: w.subject, html: mail.welcomeHtml({ subject: w.subject, bodyMd: w.body_md, token }) })
    return 'sent'
  } catch (e) {
    log(`[mailing-list-optin] welcome email failed: ${errText(e)}`)
    return 'failed'
  }
}

/** An error's message for the log, with any address in it masked. */
function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/[^\s"'<>@]+@[^\s"'<>@]+/g, '<address>').slice(0, 300)
}
