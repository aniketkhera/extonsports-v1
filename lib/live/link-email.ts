// The "here is tonight's link" email. PURE string building — no Resend, no Next — so the
// words can be read by a test, the way app/api/apply/ack-email.ts is. 2026-11-09.
//
// WHAT THIS EMAIL IS NOT. It is not a newsletter and it carries no YouTube address. The
// watch link points at extonsports.com, so the broadcast's own URL never leaves our site and
// a forwarded email cannot outlive the day the link was minted.

const ACCENT = '#F37A4A'
const INK = '#222222'

export type LinkEmailFacts = {
  /** The watch link, already built by lib/live/token.ts watchUrl(). */
  url: string
  /** The club's day the link is good for, YYYY-MM-DD at the club. */
  day: string
  brandName: string
  /** Where a parent replies if the link does not work. */
  replyTo: string
  physicalAddress: string
}

/** "Monday 9 November" — the day said the way a parent would say it, not as a date stamp. */
export function dayWords(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return day
  // Noon UTC: far enough from either midnight that no time zone can shift the date.
  const at = new Date(Date.UTC(y, m - 1, d, 12))
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(at)
}

export function linkEmailSubject(f: Pick<LinkEmailFacts, 'brandName'>): string {
  return `Your link to watch today at ${f.brandName}`
}

export function linkEmailText(f: LinkEmailFacts): string {
  return [
    `Here is your link to watch today's coaching at ${f.brandName}:`,
    '',
    f.url,
    '',
    `It works for ${dayWords(f.day)} only. We send a new link each day, so tomorrow's`,
    'session needs a new one — ask again at extonsports.com/live.',
    '',
    'If nothing is on air when you open it, the page will say so. Coaching sessions',
    'appear a few minutes after the coaches start.',
    '',
    'Please keep this link to yourself. It shows children at their coaching session.',
    '',
    `Questions: ${f.replyTo}`,
    f.physicalAddress,
  ].join('\n')
}

/** The body only. The club's shell (logo, rule, footer) wraps this at send time. */
export function linkEmailHtml(f: LinkEmailFacts): string {
  const p = `margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK}`
  return [
    `<p style="font-size:20px;font-weight:700;margin:0 0 10px">Here is your link for today</p>`,
    `<p style="${p}">Tap below to watch today's coaching at ${esc(f.brandName)}.</p>`,
    `<p style="margin:0 0 18px"><a href="${esc(f.url)}" style="display:inline-block;padding:14px 26px;border-radius:6px;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px">Watch today's session</a></p>`,
    `<p style="${p}"><strong>This link works for ${esc(dayWords(f.day))} only.</strong> We send a new one each day, so tomorrow's session needs a fresh link &mdash; ask again at <a href="https://extonsports.com/live" style="color:${ACCENT}">extonsports.com/live</a>.</p>`,
    `<p style="${p};font-size:15px;color:#555">If nothing is on air when you open it, the page will say so. Sessions appear a few minutes after the coaches start.</p>`,
    `<p style="${p};font-size:15px;color:#555"><strong>Please keep this link to yourself.</strong> It shows children at their coaching session.</p>`,
    `<p style="margin:22px 0 0;font-size:13px;color:#777">You asked for this link at extonsports.com/live. Questions: <a href="mailto:${esc(f.replyTo)}" style="color:${ACCENT}">${esc(f.replyTo)}</a></p>`,
  ].join('\n')
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
