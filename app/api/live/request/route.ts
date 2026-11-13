// POST /api/live/request — "email me today's watch link". 2026-11-09.
//
// ⛔ THE ANSWER IS THE SAME WHATEVER HAPPENS. Whether the address is new, already on the
// list, or mistyped into a real stranger's inbox, this route answers 202 with the same body.
// Anything else turns the form into an oracle for "does this person's address exist at the
// club", and the form sits on a public page. Same reasoning as /api/my-bookings/request.
//
// We do NOT check whether a class is on air before sending. A parent who asks at 5:40 pm for
// a 6:00 pm session must still get their link; the page they open decides what to show.

import { clientIp, hit, isEmailShape, readJsonBody } from '@/lib/my-bookings/guard'
import { json, refuseCrossSite } from '@/lib/my-bookings/http'
import { clubDay, mintToken, watchUrl } from '@/lib/live/token'
import { linkEmailHtml, linkEmailSubject, linkEmailText } from '@/lib/live/link-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BRAND = 'Exton Sports Center'
const FROM = 'Exton Sports Center <noreply@extonsports.com>'
const REPLY_TO = 'info@extonsports.com'
const ADDRESS = '4 Tabas Lane, Building 2, Exton, PA 19341'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused

  const body = await readJsonBody(req)
  if (!body) return json({ error: 'bad_request' }, 400)

  // Honeypot, the BadmintonEnquiry.tsx pattern: a bot that fills every field is told exactly
  // what a person is told, and nothing is sent.
  if (typeof body.company === 'string' && body.company.trim() !== '') return json({ ok: true }, 202)

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isEmailShape(email)) return json({ error: 'bad_email' }, 400)

  const ip = clientIp(req)
  // Per instance and best effort; this is a brake on a script, not a security boundary.
  if (hit(`live:${ip}`, 6, 10 * 60_000)) return json({ error: 'slow_down' }, 429)
  // A second, tighter brake per address, so one scripted address cannot be mail-bombed
  // through many instances' worth of the IP limit above.
  if (hit(`live-addr:${email.toLowerCase()}`, 4, 10 * 60_000)) return json({ ok: true }, 202)

  const key = process.env.LIVE_LINK_KEY
  if (!key) {
    console.error('[live/request] LIVE_LINK_KEY is not set; no link can be minted')
    return json({ error: 'try_again' }, 503)
  }

  const day = clubDay()
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://extonsports.com'
  const url = watchUrl(origin, mintToken(email, key, day))
  const facts = { url, day, brandName: BRAND, replyTo: REPLY_TO, physicalAddress: ADDRESS }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[live/request] RESEND_API_KEY is not set; nothing sent')
    return json({ error: 'try_again' }, 503)
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject: linkEmailSubject({ brandName: BRAND }),
        html: linkEmailHtml(facts),
        text: linkEmailText(facts),
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      // The address is NOT logged: a failed send is an operational fact, not a reason to
      // write a parent's address into Vercel's log retention.
      console.error('[live/request] resend %s', res.status)
      return json({ error: 'try_again' }, 503)
    }
  } catch (e) {
    console.error('[live/request] resend threw: %s', e instanceof Error ? e.message : String(e))
    return json({ error: 'try_again' }, 503)
  }

  // The mailing list is a SEPARATE, opt-in call the page makes to
  // /api/mailing-list-optin when the box is ticked. Deliberately not done here: asking for a
  // watch link is not consent to a newsletter, and that route already has the rule that a
  // repeat signup must never undo an unsubscribe.
  return json({ ok: true }, 202)
}
