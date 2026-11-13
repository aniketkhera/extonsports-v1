/* The /live gate's pure parts. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-09: "let's do the email form on /live now", "let's have a new link
   every day".

   This file deliberately owns almost nothing. The October popup already solved the same
   problem — one address, Send, a ticked-by-default mailing-list box, and an answer that
   says the same sentence whatever the address turns out to be — so the rules live in
   my-bookings-pure.ts and this only swaps the endpoint. In particular sendWithOptin keeps
   the rule that a mailing-list failure can never reach the outcome the parent is shown. */

import { joinMailingList, outcomeFor, sendWithOptin, type Outcome } from './my-bookings-pure'

export const LIVE_PATH = '/live'
export const LIVE_REQUEST_PATH = '/api/live/request'

export const LIVE_COPY = {
  title: 'Watch today’s coaching',
  lede:
    'Put in your email and we’ll send you a link to watch. The link works for today only — we send a new one each day.',
  field: 'Your email',
  optin: 'Add me to the Exton Sports mailing list',
  send: 'Email me the link',
  sending: 'Sending…',
  /** The SAME sentence whatever the address turns out to be. */
  sent: 'Check your email — we’ve sent you a link to watch today’s session.',
  invalid: 'That doesn’t look like an email address.',
  failed: 'We couldn’t send that just now. Please try again in a minute.',
  /** On the watch page. */
  offAir: 'No session is on air right now.',
  offAirMore:
    'Coaching appears here a few minutes after the coaches start. If a session is running and you still see this, the stream has not come up — please tell the front desk.',
  /** Under the off-air message; OffAirRefresh is what makes it true. */
  autoSwitch: 'This page switches to the picture by itself when the session starts.',
  unknown: 'We can’t tell whether a session is on air right now.',
  unknownMore: 'This is a problem at our end, not yours. Please try again in a minute.',
  expired: 'This link has expired.',
  expiredMore:
    'Watch links work for the day they were sent. Ask for today’s link and we’ll email you a new one.',
  again: 'Email me today’s link',
  keepIt: 'Please keep your link to yourself. It shows children at their coaching session.',
} as const

/** POST the address to /api/live/request. Mirrors sendBookingList's contract exactly. */
export async function requestLiveLink(
  email: string,
  o: { website?: string } = {},
): Promise<Outcome> {
  try {
    const res = await fetch(LIVE_REQUEST_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, company: o.website ?? '' }),
    })
    return outcomeFor(res.status)
  } catch {
    return 'failed'
  }
}

/** Send the watch link, and the mailing-list opt-in when the box is ticked. */
export function sendLiveLink(
  email: string,
  opts: { optin: boolean; website?: string },
  impl = { sendBookingList: requestLiveLink, joinMailingList },
): Promise<Outcome> {
  return sendWithOptin(email, opts, impl)
}

export type { Outcome }
