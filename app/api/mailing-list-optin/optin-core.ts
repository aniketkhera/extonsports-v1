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
   welcome lookup and its owner notify, which the package does not export.

   THE RULE: look for the address in ANY state (active or unsubscribed, any letter case),
   and if there is one, do nothing at all: no update, no welcome, no notify. Only an address
   with no row gets a row, with a plain INSERT, which can never modify an existing row; the
   unique key (property, email) turns a concurrent duplicate into an error, and an error
   sends nothing. Any doubt (a failed lookup, a full page of look-alikes) is "exists".

   ⛔ NEVER REVEAL. The answer is decided BEFORE the database is asked anything, and the work
   runs after the response (route.ts, after()), so neither the body nor the timing says
   whether an address was on the list. The popup ignores the answer anyway: the toast comes
   from the booking-list request alone. */

import type { MailerConfig } from 'mailer-admin/config'
import { isEmailShaped } from '../../components/my-bookings-pure'

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
  /** The brand accent for the notify's heading. */
  accent?: string
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
 *  rows that come back are compared exactly. */
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

  let found: { email: string | null }[]
  try {
    found = await db.selectRows<{ email: string | null }>('subscribers', {
      select: 'email',
      filters: { property: `eq.${site.property}`, email: `ilike.${likePattern(email)}` },
      limit: LOOKUP_LIMIT,
    })
  } catch (e) {
    log(`[mailing-list-optin] lookup failed, nothing added: ${errText(e)}`)
    return 'error'
  }
  if (found.length >= LOOKUP_LIMIT || found.some((r) => norm(r.email) === email)) return 'exists'

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

  await sendWelcome(email, token, deps)
  await notifyOwner(email, geo, deps)
  return 'added'
}

/** mailer-admin's sendWelcomeIfEnabled, which it does not export: the property's
 *  welcome_emails row, if switched on and not blank. One difference, on purpose: no token,
 *  no welcome, rather than an email whose unsubscribe link is "#". */
async function sendWelcome(email: string, token: string | null, deps: OptinDeps): Promise<void> {
  const { site, db, mail, log } = deps
  if (site.welcomeEmails === false) return
  if (!token) {
    log('[mailing-list-optin] new row has no unsubscribe token; welcome not sent')
    return
  }
  try {
    const [w] = await db.selectRows<{ subject: string | null; body_md: string | null; enabled: boolean | null }>(
      'welcome_emails',
      { select: 'subject,body_md,enabled', filters: { property: `eq.${site.property}` }, limit: 1 },
    )
    if (!w || !w.enabled || !w.subject?.trim() || !w.body_md?.trim()) return
    await mail.send({ to: email, subject: w.subject, html: mail.welcomeHtml({ subject: w.subject, bodyMd: w.body_md, token }) })
  } catch (e) {
    log(`[mailing-list-optin] welcome email failed: ${errText(e)}`)
  }
}

/** The footer's owner notify (mailer-admin notifyHtml, not exported), with the source. */
async function notifyOwner(email: string, geo: Geo, deps: OptinDeps): Promise<void> {
  const { site, mail, log } = deps
  if (!site.notifyEmail || (Array.isArray(site.notifyEmail) && site.notifyEmail.length === 0)) return
  try {
    await mail.send({
      to: site.notifyEmail,
      subject: `New ${site.brandName} signup — ${email}`,
      html: notifyHtml(site, { email, source: OPTIN_SOURCE, ...geo }, deps.accent || '#F37A4A'),
    })
  } catch (e) {
    log(`[mailing-list-optin] notify email failed: ${errText(e)}`)
  }
}

export function notifyHtml(
  site: Pick<OptinSite, 'brandName'>,
  o: { email: string; source: string } & Geo,
  accent: string,
): string {
  const loc = [o.city, o.region, o.country].filter((x): x is string => !!x).map(esc).join(', ')
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;width:140px;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${value}</td></tr>`
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:${esc(accent)};margin:0 0 24px;font-size:18px;">New ${esc(site.brandName)} signup</h2>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row('Email', `<a href="mailto:${esc(o.email)}" style="color:${esc(accent)};">${esc(o.email)}</a>`)}
        ${row('Source', esc(o.source))}
        ${loc ? row('Location', loc) : ''}
        ${row('When', new Date().toISOString())}
      </table>
      <p style="margin-top:24px;color:#888;font-size:12px;">They ticked &ldquo;Add me to the Exton Sports mailing list&rdquo; in the My bookings popup, and have been added automatically.</p>
    </div>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** An error's message for the log, with any address in it masked. */
function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/[^\s"'<>@]+@[^\s"'<>@]+/g, '<address>').slice(0, 300)
}
