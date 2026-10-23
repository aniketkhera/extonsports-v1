// Every sentence a guest reads on extonsports.com/my-bookings, 2026-10-20. Pure.
//
// One file so the wording can be reviewed in one place, and so the rules it carries are
// testable: the request screen says the SAME thing whether or not the email has bookings
// (owner, 2026-10-18 — never reveal whether an address has an account or bookings, as
// orangish-app docs/starter-pack-email-checkout.md), and a cancel is only ever called
// done when the platform said so.
//
// The phone in a message is the CLUB's, sent by the platform from locations.phone, so a
// change there reaches this page with no deploy. CONTACT_PHONE (lib/legal.ts) is only the
// fallback for answers that carry none — a timeout has no body to carry it in.

import { CONTACT_PHONE } from '../legal'
import type { CancelView } from './view'

export const FALLBACK_PHONE = CONTACT_PHONE

/** The cutoff the owner set on 2026-10-18; the platform's GUEST_SELF_CANCEL_CUTOFF_HOURS. */
export const DEFAULT_CUTOFF_HOURS = 24

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** 4500 -> "$45.00". */
export function money(cents: number): string {
  return USD.format(Math.round(cents) / 100)
}

export const COPY = {
  // Review fixes, 2026-10-22: the page's heading, and with " · Exton Sports Center" its
  // <title> (app/my-bookings/layout.tsx). It was "My bookings", but the footer link that
  // leads here reads "Manage or cancel a booking", and on the home page "My bookings" is the
  // hero button that opens the "Email my bookings" popup, a different thing (it emails a
  // list; this page signs in and cancels). One name per thing: this page takes the footer
  // link's words, and "My bookings" names only that button. The URL stays /my-bookings.
  title: 'Manage or cancel a booking',
  lead: "See or cancel a court you booked online. Enter the email you booked with and we'll send you a link.",
  emailLabel: 'Email',
  sendButton: 'Send me a link',
  sending: 'Sending…',
  // ⛔ ALWAYS this, whatever the platform found. See the header. Second review, 2026-10-20:
  // the platform holds a new email back while the inbox already has a live link (so nobody
  // can lock a guest out by asking for their address), and a link may live 30 minutes or 2
  // hours — so this promises neither a fresh email nor a time, and says the earlier ones work.
  sent: "If this email has bookings with us, we've sent a link. Any link or code from us that hasn't expired still works. On another device? Enter the 6‑digit code from the email.",
  haveCode: 'I have a code',
  codeLead: 'Enter the email you booked with and the 6‑digit code from our email.',
  codeLabel: '6‑digit code', // U+2011, a hyphen that never breaks the line after "6"
  codeButton: 'Continue',
  checking: 'Checking…',
  codeError: "That code didn't work. Check it, or ask for a new link.",
  badEmail: 'Check the email address.',
  tooMany: 'Too many tries. Wait a few minutes and try again.',
  openLead: 'Tap to see your bookings on this device.',
  openButton: 'Show my bookings',
  opening: 'Opening…',
  expired: 'This link has expired or has already been used.',
  sendNew: 'Send a new link',
  signedOut: 'This device is signed out. Enter your email to get a new link.',
  empty: 'No upcoming bookings for this email.',
  bookCta: 'Book a court or lane',
  notYou: 'Not you? Sign out of this device',
  signingOut: 'Signing out…',
  cancelButton: 'Cancel booking',
  confirmYes: 'Yes, cancel and refund',
  confirmNo: 'Keep it',
  pending: 'Cancelling…',
  processing: "We're finishing your cancellation. You'll get an email when it's done.",
  inProgress: 'This booking is already being cancelled.',
  unknown: "We couldn't confirm that. Reload this page in a minute to check.",
  notFound: "We couldn't find that booking on this device. Reload this page to see your bookings.",
  reload: 'Reload',
} as const

/**
 * The one line at the foot of the request panel for everybody this page cannot help,
 * 2026-10-22 (the default put to Aniket for review when this page was rebased onto the
 * shipped "Email my bookings"). A sign-in link goes only to an address that booked and paid for a court online
 * as the hirer (orangish-app docs/guest-my-bookings.md, scope C1), so a member, or somebody
 * who booked on account or through a club, would wait here for an email that never comes.
 * The home page's "My bookings" popup emails today's and upcoming bookings of every kind an
 * address holds, so the line points there, and to the phone.
 *
 * ⛔ STATIC. The same words for every visitor and in EVERY state of the request panel —
 * before anything is sent, after "Send me a link" (the "sent" screen) and on "I have a
 * code" — and never changed by an answer, so it says nothing about whether an address has
 * bookings (owner, 2026-10-18). Review fixes, 2026-10-22: it used to vanish on the "sent"
 * screen, which is exactly where a member is left waiting for a link that never comes.
 * It promises neither a sign-in nor a cancel from the popup: that email is a list.
 * `listEmailLive` is lib/booking.ts BOOKING_LIST_EMAIL_LIVE; while that popup is switched
 * off the line names only the phone, so it never points at a button that is not there.
 * `link`, when present, is rendered as a link to the home page between `before` and
 * `after`; the phone is always in `after`, so it renders through PhoneText as a tel: link.
 *
 * Review fixes, 2026-10-22: `link` is the hero button's own label, "My bookings" (shown in
 * capitals there, as MY BOOKINGS), in quotes. It said "Email my bookings", the popup's
 * title, which no visitor can see until they have found and pressed that button.
 */
export function otherBookings(phone: string, listEmailLive: boolean): { before: string; link?: string; after: string } {
  const before = "Booked as a member, or on account? Those bookings don't get a sign-in link here. "
  return listEmailLive
    ? { before: before + 'Use "', link: 'My bookings', after: `" on the home page to have them emailed to you, or call ${phone}.` }
    : { before, after: `Call ${phone}.` }
}

export const platformDown = (phone: string) =>
  `We couldn't send that just now. Try again in a minute, or call ${phone}.`
export const listUnavailable = (phone: string) =>
  `We can't show your bookings right now. Try again in a minute, or call ${phone}.`
export const bookingsFor = (masked: string) => `Bookings for ${masked}`

export const rowTitle = (sport: string, whenText: string) => `${sport} · ${whenText}`
// "Courts: BADMINTON 1, BADMINTON 2" — every court by name, never a range: "1-3" against
// "1, 3" is one character and a different number of courts.
export const rowCourts = (courts: string[]) => `${courts.length === 1 ? 'Court' : 'Courts'}: ${courts.join(', ')}`
export const rowPaid = (cents: number) => `Paid ${money(cents)}`
export const rowCancelBy = (cancelByText: string) => `Cancel by ${cancelByText} for a full refund.`
export const rowCancelled = (cents: number | null) =>
  cents === null ? 'Cancelled.' : `Cancelled · ${money(cents)} refunded`
export const confirmText = (cents: number) =>
  `Cancel this booking? We'll refund ${money(cents)} to the card you paid with.`

/** The spec's own sentence (owner, 2026-10-18). */
export const tooLate = (phone: string, hours = DEFAULT_CUTOFF_HOURS) =>
  `To cancel within ${hours} hours, call ${phone}.`
export const callClub = (phone: string) =>
  `We couldn't cancel this online. Please call ${phone} and we'll sort it out.`
export const cancelTryAgain = (phone: string) =>
  `That didn't go through, and nothing has changed. Try again in a minute, or call ${phone}.`

/**
 * The club's number as a link a phone dials (second review, 2026-10-20): every sentence
 * here that says "call …" is read on a phone, mostly. A 10-digit number is a US one; a
 * number written with + keeps its own country code; anything else is not linked.
 */
export function telHref(phone: string): string | null {
  const t = phone.trim()
  const digits = t.replace(/\D/g, '')
  if (t.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `tel:+${digits}` : null
  if (digits.length === 10) return `tel:+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`
  return null
}

export type PhonePart = { text: string; href?: string }

/** A sentence split around the club's number, the number carrying its tel: link. Rendered by
 *  app/my-bookings/_components/PhoneText.tsx. A number that cannot be dialled stays text. */
export function phoneParts(text: string, phone: string): PhonePart[] {
  const href = phone ? telHref(phone) : null
  if (!href || !text.includes(phone)) return [{ text }]
  const out: PhonePart[] = []
  text.split(phone).forEach((chunk, i) => {
    if (i > 0) out.push({ text: phone, href })
    if (chunk) out.push({ text: chunk })
  })
  return out
}

/** What a row says after its Cancel was pressed. */
export function cancelMessage(view: CancelView, fallbackPhone: string = FALLBACK_PHONE, hours = DEFAULT_CUTOFF_HOURS): string {
  const phone = view.phone ?? fallbackPhone
  switch (view.status) {
    case 'cancelled':
      return view.refundedCents !== undefined
        ? `Cancelled. ${money(view.refundedCents)} is on its way back to your card — usually 5–10 business days. We've emailed you a confirmation.`
        : "Cancelled. Your refund is on its way back to your card — usually 5–10 business days. We've emailed you a confirmation."
    case 'already_cancelled':
      return view.refundedCents !== undefined
        ? `Already cancelled. ${money(view.refundedCents)} was refunded.`
        : 'Already cancelled.'
    case 'too_late':
      return tooLate(phone, hours)
    case 'processing':
      return COPY.processing
    case 'in_progress':
      return COPY.inProgress
    case 'not_cancellable':
    case 'needs_staff':
      return callClub(phone)
    case 'not_found':
      return COPY.notFound
    case 'signed_out':
      return COPY.signedOut
    case 'try_again':
      return cancelTryAgain(phone)
    default:
      return COPY.unknown
  }
}
