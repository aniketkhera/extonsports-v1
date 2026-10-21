/* The footer bar's "Join our mailing list" with Exton's new staff notice, and mailer-admin
   otherwise exactly as it was.
   ──────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21: the footer's signups get the same new notice as the My bookings
   popup (lib/signup-notice.ts), for Exton only, without changing mailer-admin.

   WHY A WRAPPER. /api/waitlist is mailer-admin's createSubscribeRoute: the dedupe, the
   resubscribe on an explicit footer signup, the welcome for a brand-new address, the tags,
   UTM and geo, the honeypot and the per-IP limit all live there, and that package is
   shared by several sites (a git dependency), so editing it means a push and a version
   bump for all of them, and the other sites would get Exton's notice or a new option they
   never asked for. Copying the route here instead would fork all of that logic to change
   one email. So the package's route still does every bit of the work, unedited, and this
   file only:
     1. hands it a copy of the config whose notifyEmail is null, which switches its plain
        notice off through its own option (`if (cfg.notifyEmail && wasNew)`);
     2. before calling it, looks the address up the way the popup does (any state, any
        case, spaces either side; addressOnList in the popup's optin-core.ts) and keeps
        the answer;
     3. returns the package's own Response object, untouched, to the browser;
     4. after the response (route.ts runs this in after()), if the address was NOT on the
        list before and IS on it now, and this server has not already sent a notice for
        that subscriber row, sends the new notice.

   WHY "absent before, present after" and not something cleverer: the package does not
   say whether it inserted (it answers { success: true } for a new address, a resubscribe,
   an existing one and a failed write alike), and the only other ways to find out are
   intercepting its fetch or its Resend client, which would break silently on any package
   change. The two lookups are plain reads, and doubt goes one way: a lookup that fails,
   or an address already there in any state, means no notice. So a resubscribe, an
   existing address or a write that failed never produces one.

   ONE NOTICE PER PERSON (review, 2026-10-21). Two requests for the same never-seen
   address landing together both see it absent before and present after; the package's
   unique key lets one insert (and one welcome) win, but both would send a notice. So the
   "after" lookup reads the row's id, and finish() claims that id, synchronously, before
   it sends; the second request finds it claimed and stays quiet. Claims live in this
   module's memory for 10 minutes. That covers requests on the same server instance, which
   is where a double-click or a second tab lands while it is warm; two requests served by
   two different instances can still give two notices. Closing that would need a write
   (a "noticed" column, or a lock row), which this wrapper deliberately never makes: every
   write stays the package's.

   NO LIMITER OF ITS OWN (review, 2026-10-21). The wrapper used to keep its own
   5-a-minute count per IP beside the package's, to skip the "before" lookup for requests
   the package would throttle. The two windows could not agree: the package counts a
   request only after the wrapper's lookup, so its window starts later, and a burst from
   one IP (club Wi-Fi) could leave a request that the package accepted, inserted and
   welcomed but that the wrapper had refused to look up, so no notice. Now the package's
   limiter is the only one, and its answer decides: no 200, no notice.

   What it costs: one extra read (the "before" lookup) ahead of the package. It is skipped
   for anything the wrapper can see the package will refuse (not JSON, no valid address,
   a filled honeypot) or when there is nobody to notify, but no longer for a request the
   package will throttle: such a request now costs one read on the subscribers table
   (property-filtered, at most 100 rows back) before the package's 429. The "after"
   lookup, the welcome check, the count and the send all run after the response.

   What it cannot know: whether the package's welcome send worked. The package logs a
   failure and answers success either way, so the notice says only that the welcome is
   switched on ('on' in lib/signup-notice.ts), never that this one went out.

   Tests: footer-notice.test.mjs runs the real package route against a fake PostgREST
   and Resend and checks the browser, the rows and the welcome are identical with and
   without this wrapper. */

import { createSubscribeRoute } from 'mailer-admin/api/subscribe'
import { createSupabase } from 'mailer-admin/lib/supabase'
import type { MailerConfig } from 'mailer-admin/config'
import type { NextRequest } from 'next/server'
import { addressOnList, geoFrom } from '../mailing-list-optin/optin-core'
import { sendSignupNotice, type NoticeAcquisition, type NoticeDeps, type NoticeGeo, type WelcomeStatus } from '../../../lib/signup-notice'
import { noticeDepsFor } from '../../../lib/signup-notice-send'

/** mailer-admin's subscribe route checks addresses with this; copied so the wrapper
 *  skips its lookup for exactly the requests the package will refuse. */
const PACKAGE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** How long a sent notice's subscriber id stays claimed. Ten minutes is far longer than
 *  two racing requests take, and short enough that the map stays small. */
const CLAIM_MS = 10 * 60_000

export type FooterOptions = {
  /** Run work after the response; route.ts passes next/server's after(). */
  defer(work: () => Promise<void>): void
  /** The notice's clock. Default: now. */
  now?: () => Date
  /** Server log. Never given an address. Default: console.error. */
  log?: (message: string) => void
  /** The notice's brand, count and sender. Default: noticeDepsFor(cfg). */
  notice?: NoticeDeps
}

type Plan = {
  email: string
  name: string
  geo: NoticeGeo
  acquisition: NoticeAcquisition
  at: Date
}

export function createFooterSubscribe(cfg: MailerConfig, opts: FooterOptions) {
  const inner = createSubscribeRoute({ ...cfg, notifyEmail: null })
  const supa = createSupabase(cfg)
  const log = opts.log ?? ((m: string) => console.error(m))
  const notice = opts.notice ?? noticeDepsFor(cfg, log)
  const now = opts.now ?? (() => new Date())

  /** Subscriber ids this instance has sent (or is sending) a notice for, with when each
   *  claim lapses. One map per server: route.ts builds the wrapper once, at module load. */
  const claimed = new Map<string, number>()
  /** True the first time `key` is seen within CLAIM_MS. Synchronous on purpose: no await
   *  between the check and the set, so two finish() calls cannot both pass. */
  function claim(key: string): boolean {
    const t = Date.now()
    for (const [k, until] of claimed) if (until <= t) claimed.delete(k)
    if (claimed.has(key)) return false
    claimed.set(key, t + CLAIM_MS)
    return true
  }

  const hasRecipients = () => {
    const to = cfg.notifyEmail
    return Array.isArray(to) ? to.some((a) => typeof a === 'string' && a.trim()) : typeof to === 'string' && !!to.trim()
  }

  /** Decide, BEFORE the package runs, whether this request could be a new signup worth a
   *  notice. Never throws: any doubt is null, and null only means "no notice". */
  async function plan(req: NextRequest): Promise<Plan | null> {
    if (!hasRecipients() || !supa.configured()) return null

    let body: unknown
    try { body = await req.clone().json() } catch { return null }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    const b = body as Record<string, unknown>

    if (cfg.honeypotField && str(b[cfg.honeypotField])) return null

    // The package's own reading of the address: `email`, else `contact`, lower-cased.
    const contact = str(b.email) || str(b.contact)
    if (!contact.includes('@')) return null
    const email = contact.toLowerCase()
    if (!PACKAGE_EMAIL_RE.test(email)) return null

    try {
      if (await addressOnList(supa, cfg.property, email)) return null
    } catch (e) {
      log(`[waitlist] lookup before signup failed, no notice: ${errText(e)}`)
      return null
    }

    const name = str(b.name) || [str(b.first_name), str(b.last_name)].filter(Boolean).join(' ')
    return {
      email,
      name,
      geo: geoFrom(req.headers),
      acquisition: {
        referrer: str(b.referrer) || null,
        utm_source: str(b.utm_source) || null,
        utm_medium: str(b.utm_medium) || null,
        utm_campaign: str(b.utm_campaign) || null,
      },
      at: now(),
    }
  }

  /** After the response: notice only if the address is on the list now, active, and its
   *  row has not had a notice from this instance already. */
  async function finish(p: Plan): Promise<void> {
    let rows: { id: string | null; unsubscribed_at: string | null }[]
    try {
      // The package stores the address exactly as it was read above (trimmed, lower-cased).
      rows = await supa.selectRows<{ id: string | null; unsubscribed_at: string | null }>('subscribers', {
        select: 'id,unsubscribed_at',
        filters: { property: `eq.${cfg.property}`, email: `eq.${p.email}` },
        limit: 1,
      })
    } catch (e) {
      log(`[waitlist] lookup after signup failed, no notice: ${errText(e)}`)
      return
    }
    if (rows.length === 0 || rows[0].unsubscribed_at) return
    // By the row's id (it always has one); by the address if it somehow does not.
    if (!claim(rows[0].id ? `id:${rows[0].id}` : `email:${p.email}`)) return

    await sendSignupNotice(
      cfg.notifyEmail,
      { email: p.email, source: 'footer', welcome: await welcomeStatus(), at: p.at, geo: p.geo, name: p.name, acquisition: p.acquisition },
      notice,
    )
  }

  /** What can be known from outside the package about the welcome: whether it is switched
   *  on (cfg.welcomeEmails and an enabled, non-blank welcome_emails row), not whether the
   *  package's send worked, since a failure is only in its log. So on is 'on' (the notice
   *  states the setting), never 'sent' (the notice would say it went out; review,
   *  2026-10-21: a welcome Resend refused was announced as sent). Unreadable: no claim. */
  async function welcomeStatus(): Promise<WelcomeStatus> {
    if (cfg.welcomeEmails === false) return 'off'
    try {
      const [w] = await supa.selectRows<{ subject: string | null; body_md: string | null; enabled: boolean | null }>(
        'welcome_emails',
        { select: 'subject,body_md,enabled', filters: { property: `eq.${cfg.property}` }, limit: 1 },
      )
      return w && w.enabled && w.subject?.trim() && w.body_md?.trim() ? 'on' : 'off'
    } catch (e) {
      log(`[waitlist] welcome setting unreadable, notice makes no claim: ${errText(e)}`)
      return 'unknown'
    }
  }

  async function POST(req: NextRequest): Promise<Response> {
    const p = await plan(req)
    const res = await inner.POST(req)
    // The package answers 200 for every signup it accepted (new, existing or resubscribed)
    // and for a write that failed; finish() tells those apart by looking. Its 429 (the
    // only rate limit now) and its 400s never get this far.
    if (p && res.status === 200) opts.defer(() => finish(p))
    return res
  }

  return { POST }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** An error's message for the log, with any address in it masked. */
function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/[^\s"'<>@]+@[^\s"'<>@]+/g, '<address>').slice(0, 300)
}
