/* Exton's "new signup" notice to the staff: one renderer for every way onto the list.
   ──────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21, on the plain table mailer-admin used to send: "need it to be better
   looking". He approved a mockup in the mailer's own look (cream page, white card, the
   orange accent, the Exton logo), then "for the first one, leave it out for everyone":
   the mockup's "Open subscribers" button is gone for every recipient, so this notice is
   information only. It has no button and no admin link, and the only link in it is the
   new address (mailto). Tests: lib/signup-notice.test.mjs.

   Two routes send it, both through sendSignupNotice below:
     - the My bookings popup's mailing-list box (app/api/mailing-list-optin), and
     - the footer bar (app/api/waitlist, footer-notice.ts), which keeps mailer-admin's
       subscribe route and only swaps its plain notice for this one.

   Honest about the welcome: the sentence says the welcome email "has gone out" only when
   the route knows it was sent (or, for the footer, that it is switched on and the package
   sent it). Off says off, failed says it did not go out, and not knowing says nothing.

   Pure: no imports that run. The Resend send and the database count are handed in
   (lib/signup-notice-send.ts wires the real ones), so node:test can drive all of it. */

export type NoticeSource = 'popup' | 'footer'

/** What happened to the new subscriber's welcome email, as far as the route knows. */
export type WelcomeStatus = 'sent' | 'off' | 'failed' | 'unknown'

export type NoticeGeo = { country: string | null; region: string | null; city: string | null }

/** The footer's acquisition fields, as its form posts them. */
export type NoticeAcquisition = {
  referrer?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}

export type NoticeTheme = {
  accent: string
  pageBg: string
  panelBg: string
  headerBg: string
  border: string
  borderSoft: string
  text: string
  mutedText: string
}

export type NoticeBrand = {
  /** "Exton Sports Center"; printed upper-case as the header's eyebrow. */
  name: string
  /** "extonsports.com", as the sentences and the footer line say it. */
  host: string
  /** Absolute https URL; email clients cannot resolve a relative one. */
  logoUrl?: string
  theme: NoticeTheme
}

export type NoticeInput = {
  email: string
  source: NoticeSource
  welcome: WelcomeStatus
  /** When they signed up. Printed on Exton's clock. */
  at: Date
  geo?: NoticeGeo | null
  /** The footer bar asks for a name; the popup does not. */
  name?: string | null
  /** The footer's UTM and referrer. Ignored for the popup, which has none. */
  acquisition?: NoticeAcquisition | null
  /** ACTIVE subscribers for the property, this one included; null when the count failed. */
  listCount?: number | null
}

export type RenderedNotice = { subject: string; html: string; text: string }

/** The site as the notice names it. Exton only: this file is Exton's, not mailer-admin's. */
export const EXTON_HOST = 'extonsports.com'

/** Exton's clock, the one the staff read the notice by. */
const TIMEZONE = 'America/New_York'

/** Longest UTM value or referrer host printed; a campaign name is not an essay. */
const DETAIL_MAX = 40

// The green "NEW SIGNUP" pill is the one colour not in the mailer theme (the approved
// mockup's). Body copy is the mockup's slate grey.
const PILL = { text: '#166534', bg: '#E8F6EC', border: '#BFE3CA' }
const BODY_GREY = '#4B5563'
const FONT = 'Helvetica,Arial,sans-serif'

/* ── the words ─────────────────────────────────────────────────────────────── */

const WHERE: Record<NoticeSource, { via: string; html: string; text: string }> = {
  popup: { via: 'My bookings popup', html: 'the <b>My bookings</b> popup', text: 'the My bookings popup' },
  footer: { via: 'Mailing-list form', html: 'the <b>mailing-list form</b>', text: 'the mailing-list form' },
}

/** The one sentence under the address, in HTML and in plain text. */
function sentence(brand: NoticeBrand, source: NoticeSource, welcome: WelcomeStatus): { html: string; text: string } {
  const host = esc(brand.host)
  const where = WHERE[source]
  // The popup's box is ticked before anyone touches it (a deliberate default, 2026-10-21),
  // so its notice says the box was ticked: that is how this person consented.
  const tail = source === 'popup'
    ? {
        sent: '. The mailing-list box was ticked, and our welcome email has gone out.',
        off: '. The mailing-list box was ticked. Our welcome email is switched off, so none was sent.',
        failed: '. The mailing-list box was ticked, but our welcome email did not go out.',
        unknown: '. The mailing-list box was ticked.',
      }[welcome]
    : {
        sent: ', and our welcome email has gone out.',
        off: '. Our welcome email is switched off, so none was sent.',
        failed: ', but our welcome email did not go out.',
        unknown: '.',
      }[welcome]
  return {
    html: `Joined from ${where.html} on ${host}${esc(tail)}`,
    text: `Joined from ${where.text} on ${brand.host}${tail}`,
  }
}

/** "Wed, Oct 21, 2026 · 4:18 PM ET". ET covers EDT and EST alike. */
export function formatWhen(at: Date): string {
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).format(at)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(at)
  // Newer ICU puts U+202F (narrow no-break space) before AM/PM; some mail clients show it
  // as a box, and it made the tests depend on the Node build. An ordinary space it is.
  return `${date} · ${time} ET`.replace(/[  ]/g, ' ')
}

const COUNTRY = (() => {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }) } catch { return null }
})()

/** "West Chester, PA" from Vercel's edge headers; the country only outside the US; null
 *  when nothing is known, and the row is left out. IP geolocation is a guess, which is why
 *  the notice prints "(approximate)" after it. */
export function formatNear(geo: NoticeGeo | null | undefined): string | null {
  if (!geo) return null
  const city = clean(geo.city, 60)
  const region = clean(geo.region, 30)
  const code = clean(geo.country, 2).toUpperCase()
  let country = ''
  if (code && (code !== 'US' || (!city && !region))) {
    try { country = COUNTRY?.of(code) || code } catch { country = code }
  }
  const parts = [city, region, country].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

/** The footer's campaign and referrer, briefly: "utm: a / b / c · from google.com". The
 *  referrer is cut to its host, so a search query or a token in its path never prints,
 *  and our own pages are left out (they say nothing about how someone found us). */
export function acquisitionDetail(a: NoticeAcquisition | null | undefined, ownHost: string): string | null {
  if (!a) return null
  const utm = [a.utm_source, a.utm_medium, a.utm_campaign].map((v) => clean(v, DETAIL_MAX)).filter(Boolean)
  let from = ''
  const ref = clean(a.referrer, 2000)
  if (ref) {
    try {
      const host = new URL(ref).hostname.toLowerCase().replace(/^www\./, '')
      const own = ownHost.toLowerCase().replace(/^www\./, '')
      if (host && host !== own && !host.endsWith(`.${own}`)) from = clip(host, DETAIL_MAX)
    } catch { /* not a URL: say nothing rather than print it */ }
  }
  const bits = [utm.length ? `utm: ${utm.join(' / ')}` : '', from ? `from ${from}` : ''].filter(Boolean)
  return bits.length ? bits.join(' · ') : null
}

/** The address, escaped, allowed to wrap just after the "@". At 24px most addresses are
 *  wider than a phone, and the first render (2026-10-21) broke one as "example.co" / "m".
 *  <wbr> is a break opportunity only: it is not copied with the text, unlike a zero-width
 *  space, so the address still pastes clean. */
function breakableAddress(email: string): string {
  const at = email.lastIndexOf('@')
  return at > 0 ? `${esc(email.slice(0, at + 1))}<wbr>${esc(email.slice(at + 1))}` : esc(email)
}

function people(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'person' : 'people'}`
}

/* ── the email ─────────────────────────────────────────────────────────────── */

type Row = { label: string; html: string; text: string }

export function renderSignupNotice(brand: NoticeBrand, n: NoticeInput): RenderedNotice {
  const t = brand.theme
  const email = clean(n.email, 320)
  const when = formatWhen(n.at)
  const near = formatNear(n.geo)
  const name = n.source === 'footer' ? clean(n.name, 100) : ''
  const detail = n.source === 'footer' ? acquisitionDetail(n.acquisition, brand.host) : null
  const count = typeof n.listCount === 'number' && Number.isFinite(n.listCount) && n.listCount >= 0 ? n.listCount : null
  const said = sentence(brand, n.source, n.welcome)
  const via = WHERE[n.source].via

  const muted = (s: string) => `<span style="font-weight:400;color:${t.mutedText};">${s}</span>`
  const rows: Row[] = []
  if (name) rows.push({ label: 'Name', html: esc(name), text: name })
  // The time holds together with no-break spaces, so a narrow screen breaks the line at
  // the dot and not between "4:18" and "PM" (the mockup did, on a phone).
  const [whenDate, whenTime] = when.split(' · ')
  rows.push({ label: 'When', html: `${esc(whenDate)} &middot; ${esc(whenTime).replace(/ /g, '&nbsp;')}`, text: when })
  if (near) rows.push({ label: 'Near', html: `${esc(near)} ${muted('(approximate)')}`, text: `${near} (approximate)` })
  rows.push({
    label: 'Signed up via',
    html: detail
      ? `${esc(via)}<div style="margin-top:3px;font-size:12px;line-height:17px;font-weight:400;color:${t.mutedText};">${esc(detail).replace(/ · /g, ' &middot; ')}</div>`
      : esc(via),
    text: detail ? `${via} (${detail})` : via,
  })
  if (count !== null) rows.push({ label: 'On the list now', html: esc(people(count)), text: people(count) })

  const subject = `New signup: ${email}`
  const footerLine = `You get this because you're set to receive signup notices for ${brand.host}.`
  const preheader = `Joined from ${WHERE[n.source].text} · ${when}`

  const cell = (last: boolean) =>
    `padding:11px 0;border-top:1px solid ${t.borderSoft};${last ? `border-bottom:1px solid ${t.borderSoft};` : ''}vertical-align:top;`
  const rowsHtml = rows.map((r, i) => {
    const last = i === rows.length - 1
    return `<tr>
                <td width="38%" style="${cell(last)}width:38%;color:${t.mutedText};">${esc(r.label)}</td>
                <td style="${cell(last)}font-weight:600;color:${t.text};">${r.html}</td>
              </tr>`
  }).join('\n              ')

  const logo = brand.logoUrl
    ? `<td width="44" style="width:44px;vertical-align:middle;"><img src="${esc(brand.logoUrl)}" width="44" height="44" alt="${esc(brand.name)}" style="display:block;border:0;outline:none;text-decoration:none;width:44px;height:44px;border-radius:22px;"></td>
                  <td style="padding-left:12px;vertical-align:middle;">`
    : `<td style="vertical-align:middle;">`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${t.pageBg};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${t.pageBg};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;background:${t.panelBg};border:1px solid ${t.border};border-radius:14px;border-collapse:separate;overflow:hidden;font-family:${FONT};color:${t.text};">
        <tr><td style="padding:22px 28px 18px;border-bottom:1px solid ${t.borderSoft};background:${t.headerBg};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  ${logo}
                    <div style="font-family:${FONT};font-size:11px;line-height:14px;letter-spacing:2.4px;font-weight:700;color:${t.accent};">${esc(brand.name.toUpperCase())}</div>
                    <div style="font-family:${FONT};font-size:12px;line-height:16px;color:${t.mutedText};margin-top:3px;">Mailing list</div>
                  </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:26px 28px 6px;font-family:${FONT};">
          <span style="display:inline-block;font-size:11px;line-height:14px;letter-spacing:1.6px;font-weight:700;color:${PILL.text};background:${PILL.bg};border:1px solid ${PILL.border};border-radius:999px;padding:4px 10px;">NEW SIGNUP</span>
          <div style="font-size:24px;line-height:30px;font-weight:800;margin-top:12px;overflow-wrap:anywhere;word-break:break-word;"><a href="mailto:${esc(email)}" style="color:${t.text};text-decoration:none;">${breakableAddress(email)}</a></div>
          <div style="font-size:15px;line-height:22px;color:${BODY_GREY};margin-top:6px;">${said.html.replace(/<b>/g, `<b style="color:${t.text};">`)}</div>
        </td></tr>

        <tr><td style="padding:16px 28px 22px;font-family:${FONT};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:14px;line-height:20px;">
              ${rowsHtml}
          </table>
        </td></tr>

        <tr><td style="padding:14px 28px 20px;border-top:1px solid ${t.borderSoft};font-family:${FONT};font-size:12px;line-height:18px;color:${t.mutedText};">
          ${esc(footerLine)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const width = Math.max(...rows.map((r) => r.label.length)) + 2
  const text = [
    subject,
    '',
    said.text,
    '',
    ...rows.map((r) => `${`${r.label}:`.padEnd(width)}${r.text}`),
    '',
    footerLine,
    '',
  ].join('\n')

  return { subject, html, text }
}

/* ── sending it ────────────────────────────────────────────────────────────── */

export type NoticeMail = { to: string | string[]; subject: string; html: string; text: string }

export type NoticeDeps = {
  brand: NoticeBrand
  /** ACTIVE subscribers on the property now. May throw; the row is then left out. */
  countActive(): Promise<number>
  send(mail: NoticeMail): Promise<void>
  /** Server log. Never given an address. */
  log(message: string): void
}

/** Render and send one notice to `to` (the config's notifyEmail). Never throws: a notice
 *  that fails is logged, and the signup it describes stands either way. */
export async function sendSignupNotice(
  to: string | string[] | null | undefined,
  input: Omit<NoticeInput, 'listCount'>,
  deps: NoticeDeps,
): Promise<'sent' | 'skipped' | 'failed'> {
  const list = (Array.isArray(to) ? to : [to]).map((a) => (typeof a === 'string' ? a.trim() : '')).filter(Boolean)
  if (list.length === 0) return 'skipped'
  const recipients = Array.isArray(to) ? list : list[0]

  let listCount: number | null = null
  try {
    listCount = await deps.countActive()
  } catch (e) {
    deps.log(`[signup-notice] list count failed, row left out: ${errText(e)}`)
  }

  try {
    await deps.send({ to: recipients, ...renderSignupNotice(deps.brand, { ...input, listCount }) })
    return 'sent'
  } catch (e) {
    deps.log(`[signup-notice] notice email failed: ${errText(e)}`)
    return 'failed'
  }
}

/** ACTIVE subscribers for `property`: rows with no unsubscribed_at, the same rule as the
 *  mailer-admin dashboard's "active". One HEAD with Prefer: count=exact, so PostgREST sends
 *  the total in Content-Range and no rows at all. Throws on anything else. */
export async function countActiveSubscribers(
  env: { url?: string; key?: string },
  property: string,
  fetchImpl: (url: string, init: RequestInit) => Promise<Response> = (u, i) => fetch(u, i),
): Promise<number> {
  if (!env.url || !env.key) throw new Error('mailer database not configured')
  const u = new URL(`${env.url.replace(/\/+$/, '')}/rest/v1/subscribers`)
  u.searchParams.set('select', 'id')
  u.searchParams.set('property', `eq.${property}`)
  u.searchParams.set('unsubscribed_at', 'is.null')
  const res = await fetchImpl(u.toString(), {
    method: 'HEAD',
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, Prefer: 'count=exact' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`count subscribers: ${res.status}`)
  const m = /\/(\d+)\s*$/.exec(res.headers.get('content-range') || '')
  if (!m) throw new Error('count subscribers: no total in Content-Range')
  return Number(m[1])
}

/* ── helpers ───────────────────────────────────────────────────────────────── */

/** A string with control characters (CR/LF included, so nothing can break the subject
 *  line) turned to spaces, trimmed, and cut to `max`. Anything else becomes ''. */
function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return clip(v.replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim(), max)
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
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
