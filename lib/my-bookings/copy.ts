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
import type {
  BookView, CancelView, OfferView, PackClock, PackRefusalView, PackStatus, PackUseView, QuoteSlot,
} from './view'

export const FALLBACK_PHONE = CONTACT_PHONE

/** The cutoff the owner set on 2026-10-18; the platform's GUEST_SELF_CANCEL_CUTOFF_HOURS. */
export const DEFAULT_CUTOFF_HOURS = 24

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** 4500 -> "$45.00". */
export function money(cents: number): string {
  return USD.format(Math.round(cents) / 100)
}

export const COPY = {
  title: 'My bookings',
  lead: "See or cancel a court you booked online. Enter the email you booked with and we'll send you a link.",
  emailLabel: 'Email',
  sendButton: 'Send me a link',
  sending: 'Sending…',
  // ⛔ ALWAYS this, whatever the platform found. See the header. Second review, 2026-10-20:
  // the platform holds a new email back while the inbox already has a live link (so nobody
  // can lock a guest out by asking for their address), and a link may live 30 minutes or 2
  // hours — so this promises neither a fresh email nor a time, and says the earlier ones work.
  // "or a 5-pack" since 2026-10-21 (court 5-pack design §8.3): the platform now also sends
  // to an address that holds a pack here. Still conditional — it says the same for everyone.
  sent: "If this email has bookings or a 5-pack with us, we've sent a link and a 6‑digit code. Any link or code from us that hasn't expired still works. On another device? Enter the code from the email.",
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
  // A 5-pack series (2026-10-21): no money moved, so never "refund" or "card".
  if (view.paidWith === 'pack' && (view.status === 'cancelled' || view.status === 'already_cancelled')) {
    return packCancelledMessage(view)
  }
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

/* ══ THE COURT 5-PACK (2026-10-21) ═════════════════════════════════════════════════════
   Owner, 2026-10-20: "let's go with the implentation.." — orangish-app docs/court-packs.md
   §8 (the screens, word for word where the design gives them) and §11. Every sentence the
   pack pages show lives below, so the wording is reviewed here and the rules are testable.

   ⛔ BEFORE SIGN-IN, NOTHING SAYS WHETHER AN ADDRESS HOLDS A PACK (owner, 2026-10-18;
   design §1 "Never reveal whether an email has a pack"). PACK_SIGNIN is everything the
   pack page can show before the platform answers session 'match', and every sentence in it
   is conditional ("If this email has a 5-pack or bookings with us…"). "There's no 5-pack
   on a•••@…" exists — refusalText 'no_pack' — but only after the inbox is proved. */

/** The pack page before the platform says this device's session matches (design §8.1). */
export const PACK_SIGNIN = {
  emailLead: "Enter your email and we'll send you a 6‑digit code. No password needed.",
  emailLabel: 'Your email',
  sendCode: 'Send me a code',
  sending: 'Sending…',
  // ⛔ ALWAYS this after Send, whatever the platform found — the same sentence for every
  // address, and the same 202 behind it.
  sent: "If this email has a 5-pack or bookings with us, we've sent a 6‑digit code. No password needed.",
  nothingArriving: 'Nothing arriving? Check the address, or',
  buyLink: 'buy a 5-pack',
  // The same line while there is no buy link to offer (PACKS_LIVE off: /5-pack deploys
  // unlinked). Its own sentence, so a change to the one above cannot silently break it.
  nothingArrivingNoBuy: 'Nothing arriving? Check the address.',
  codeLead: 'Enter the 6‑digit code from our email.',
  // The pack page promises a CODE, so its resend says code (the list's COPY.sendNew says link).
  sendNewCode: 'Send a new code',
  // /my-bookings/open while a pack slot is parked: what the press does, nothing about a
  // pack or bookings — it is shown before the emailed link is spent.
  openLead: 'Tap to carry on with your booking on this device.',
  payByCardInstead: 'Pay by card instead',
} as const

/** Every other fixed sentence and label on the pack pages and pack rows. */
export const PACK_COPY = {
  title: 'Book with my 5-pack',
  pickFirst: 'Pick a time first.',
  bookACourt: 'Book a court',
  pickAnother: 'Pick another time',
  notYou: 'Not you?',
  termsLabel: 'I agree to the terms, disclosure and waiver for Exton Sports',
  phoneLabel: 'Mobile (optional)',
  finePrint: 'Cancel up to 24 hours before and the credit comes back.',
  booking: 'Booking…',
  unreachable: "We couldn't reach the booking system. Try again in a moment, or pay by card.",
  // The booked screen (mock panel 4).
  bookedTitle: "You're booked",
  rowCourt: 'Court',
  rowCourts: 'Courts',
  rowWhen: 'When',
  rowPaidWith: 'Paid with',
  rowCreditsLeft: 'Credits left',
  rowValidUntil: 'Valid until',
  bookAgain: 'Book again with my pack',
  cancelThis: 'Cancel this booking',
  cancelThisNote: '(credit back until 24 hours before)',
  // My bookings: pack cards and pack rows (design §8.3).
  packsHeading: 'My 5-packs',
  bookWithMyPack: 'Book a court with my pack',
  confirmYes: 'Yes, cancel — return my credit',
  confirmNo: 'Keep my booking',
} as const

/** The public buy page, /5-pack, and its terms (design §8.2). */
export const PACK_BUY_COPY = {
  chip: 'No account needed',
  title: '5-pack.',
  titleAccent: 'Peak for off-peak.',
  lead: "Five one-hour bookings, any hour we're open — peak hours at the off-peak price.",
  sportLabel: 'Sport',
  whatYouGet: 'What you get',
  emailLabel: 'Your email',
  emailHelp: 'Your pack lives on this email. To book with it, we send a code here — no password. Your receipt comes here too.',
  termsBefore: 'I agree to the',
  termsLink: '5-pack terms',
  paying: 'Opening payment…',
  finePrint: 'Card payment by Stripe. Packs are non-refundable once paid.',
  alreadyHave: 'Already have a pack? Book a court and choose “My 5-pack” when you pay.',
  notOnSale: "5-packs aren't on sale online right now.",
  termsTitle: '5-pack terms',
  /** /5-pack/terms when the platform is off, down or unconfigured. */
  termsUnavailable: (phone: string = FALLBACK_PHONE) =>
    `We can't show the 5-pack terms right now. Try again in a minute, or call ${phone}.`,
  // /my-bookings/pack/ready (design §8.2).
  readyTitle: 'Your 5-pack is ready',
  rowPack: 'Pack',
  rowCredits: 'Credits',
  rowValid: 'Valid',
  rowPaid: 'Paid',
  rowEmail: 'Email',
  bookFirst: 'Book your first game',
  receiptNote: "We've emailed your receipt with a Book with my pack button — tap it on this phone within an hour and you won't need a code here for 90 days.",
  pendingTitle: 'Payment received — setting up your pack…',
} as const

/** "1 credit", "2 credits". */
export function creditsText(n: number): string {
  return `${n} ${n === 1 ? 'credit' : 'credits'}`
}

/** "2 of 5". */
export function ofLeft(left: number, total: number): string {
  return `${left} of ${total}`
}

/** "court" or "lane" — a cricket booking is a lane (the platform's unitFor). */
export function unitForSport(sport: string): 'court' | 'lane' {
  return /cricket/i.test(sport) ? 'lane' : 'court'
}

function unitText(unit: 'court' | 'lane', n: number): string {
  return n === 1 ? unit : `${unit}s`
}

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const DAY_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/**
 * A club-local calendar date the platform sent as YYYY-MM-DD → "Nov 29" (or "Oct 20, 2027").
 * Formatted at noon UTC in UTC, so no server or browser zone can move it a day. Not a date
 * → null, and the sentence that needed it says less.
 */
export function dayText(ymd: string | null | undefined, withYear = false): string | null {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const d = new Date(`${ymd}T12:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== ymd) return null
  return (withYear ? DAY_YEAR : DAY).format(d)
}

/**
 * The summary box (design §8.1): "1 badminton court, 6:00 PM–7:00 PM, Sun, Oct 18 · 1 credit ·
 * By card $45.00". Shown before sign-in too — it describes the SLOT, never a pack.
 */
export function slotSummary(slot: QuoteSlot): string {
  return `${slot.courts} ${slot.sport.toLowerCase()} ${unitText(slot.unit, slot.courts)}, ${slot.whenText} · ${creditsText(slot.credits)} · By card ${money(slot.cardTotalCents)}`
}

/** "This hour is $45.00 by card — your pack saves you $5.00." — only when it does save. */
export function savesLine(slot: QuoteSlot): string | null {
  if (!(slot.savesCents > 0)) return null
  const what = slot.credits === 1 ? 'This hour' : 'This booking'
  return `${what} is ${money(slot.cardTotalCents)} by card — your pack saves you ${money(slot.savesCents)}.`
}

/** "Book · use 1 credit". */
export function bookButton(credits: number): string {
  return `Book · use ${creditsText(credits)}`
}

/** "Booking as a•••@example.com on this phone" — followed by PACK_COPY.notYou. */
export function bookingAs(masked: string): string {
  return `Booking as ${masked} on this phone`
}

/**
 * A pack's state in one line (design §8.1 and §8.3):
 *   started      "3 of 5 left · valid until Dec 17 (60 days from your first game on Oct 18)"
 *   provisional  "3 of 5 left · Your 60 days start at your first game — Oct 25 if you play as booked"
 *   not_started  "5 of 5 left · Your 60 days start when you first play"
 * The clock sentence is the platform's (cp_window, the one implementation of the rule).
 */
export function packLine(p: {
  creditsLeft: number
  creditsTotal: number
  clock: PackClock
  validUntilText: string | null
  clockText: string | null
}): string {
  const left = `${ofLeft(p.creditsLeft, p.creditsTotal)} left`
  if (p.clock === 'started' && p.validUntilText) {
    return `${left} · valid until ${p.validUntilText}${p.clockText ? ` (${p.clockText})` : ''}`
  }
  return p.clockText ? `${left} · ${p.clockText}` : left
}

/** A pack that can no longer take a booking, said plainly — or null for a usable one. */
export function packStatusText(p: { status: PackStatus; creditsTotal: number; validUntilText: string | null }): string | null {
  switch (p.status) {
    case 'expired':
      return p.validUntilText ? `Expired on ${p.validUntilText}.` : 'Expired.'
    case 'used_up':
      return `All ${p.creditsTotal} credits used.`
    case 'all_booked':
      return `All ${p.creditsTotal} credits booked.`
    case 'refunded':
    case 'disputed':
      // Aniket, 2026-10-20: a refunded or disputed pack closes; games already booked stand.
      return "This pack is closed. Games you've already booked still stand."
    default:
      return null
  }
}

/** "Played Thu, Oct 15, 7:00 PM–8:00 PM · 1 credit" — a pack card's recent use. */
export function packUseLine(u: PackUseView): string {
  const verb = u.use === 'upcoming' ? 'Upcoming' : u.use === 'played' ? 'Played' : 'Returned'
  return `${verb} ${u.whenText} · ${creditsText(u.credits)}`
}

/** "Pay by card $45.00". */
export function payByCard(cents: number): string {
  return `Pay by card ${money(cents)}`
}

/** "Buy a badminton 5-pack". */
export function buySportPack(sport: string): string {
  return `Buy a ${sport.toLowerCase()} 5-pack`
}

/** Context a refusal sentence needs that the refusal itself does not carry. */
export type RefusalContext = {
  sport: string // the slot's sport, "Badminton"
  unit: 'court' | 'lane'
  need: number // the slot's credits
  email: string | null // masked
  phone: string
  date: string // the booking's date, YYYY-MM-DD
  today: string // club-local today, YYYY-MM-DD (lib/opening.ts clubDate)
}

function sportList(sports: string[]): string {
  const s = sports.map((x) => x.toLowerCase())
  return s.length <= 1 ? (s[0] ?? 'another sport') : `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

/**
 * Why no pack can pay for this slot (design §8.1), AFTER sign-in. One sentence per reason;
 * a detail that did not arrive makes the sentence shorter, never wrong.
 */
export function refusalText(r: PackRefusalView, ctx: RefusalContext): string {
  const sport = ctx.sport.toLowerCase()
  const need = r.need ?? ctx.need
  const units = unitText(ctx.unit, 2)
  const on = dayText(ctx.date)
  switch (r.reason) {
    case 'no_pack':
      return `There's no 5-pack on ${ctx.email ?? 'this email'}.`
    case 'wrong_sport': {
      const many = r.sports.length > 1
      return `Your 5-pack${many ? 's are' : ' is'} for ${sportList(r.sports)}, and this is a ${sport} ${ctx.unit}. A pack covers one sport.`
    }
    case 'too_many_credits':
      return `This booking needs ${creditsText(need)} and a pack has ${r.maxCredits ?? 'fewer'}. Book fewer ${units} or hours, or pay by card.`
    case 'not_enough_credits': {
      if (r.creditsLeft === null) {
        return `This booking needs ${creditsText(need)} and your ${sport} pack doesn't have enough left. Book fewer ${units} or hours, or pay by card.`
      }
      const fix = r.creditsLeft === 1 ? `Book 1 ${ctx.unit} for 1 hour` : `Book fewer ${units} or hours`
      return `This booking needs ${creditsText(need)} and your ${sport} pack has ${r.creditsLeft} left. ${fix}, or pay by card.`
    }
    case 'outside_window': {
      const lo = dayText(r.lo)
      const hi = dayText(r.hi)
      const tail = on ? `, and this booking is on ${on}.` : '.'
      if (lo && hi && r.lo && r.lo > ctx.today) return `Your ${sport} pack can be used from ${lo} to ${hi}${tail}`
      if (hi) return `Your ${sport} pack is valid until ${hi}${tail}`
      return `Your ${sport} pack can't be used on that date. Pick another time, or pay by card.`
    }
    case 'expired': {
      const hi = dayText(r.hi)
      return hi ? `Your ${sport} 5-pack expired on ${hi}.` : `Your ${sport} 5-pack has expired.`
    }
    case 'used_up':
      return `All ${r.creditsTotal ?? 'the'} credits on your ${sport} pack are used.`
    case 'all_booked':
      return `All ${r.creditsTotal ?? 'the'} credits on your ${sport} pack are booked.`
    case 'closed':
      return `This pack can't be used for new bookings. Questions? Call ${ctx.phone}.`
  }
}

/** "We've emailed your confirmation and how to get in to a•••@example.com." */
export function bookedLead(masked: string | null): string {
  return masked
    ? `We've emailed your confirmation and how to get in to ${masked}.`
    : "We've emailed your confirmation and how to get in."
}

/** "Badminton 5-pack · 1 credit". */
export function bookedPaidWith(packName: string, credits: number): string {
  return `${packName} · ${creditsText(credits)}`
}

/**
 * What the pack page says after Book, for every outcome but booked/already (which show
 * the booked screen) and the pack refusals (refusalText). 'unknown' sends the guest to
 * My bookings, where a booking that did land is listed; it never says "nothing changed".
 */
export function bookMessage(v: BookView, phone: string = FALLBACK_PHONE): string {
  switch (v.status) {
    case 'booked':
    case 'already':
      return PACK_COPY.bookedTitle
    case 'taken':
      return 'That time was just taken — pick another time.'
    case 'started':
      return 'That time has already started — pick another time.'
    case 'no_rate':
    case 'club_closed_hours':
      return `That time can't be booked online. Pick another time, or call ${phone}.`
    case 'changed':
    case 'credits_changed':
      return 'This booking changed while you were looking. Check it and press Book again.'
    case 'terms_required':
      return 'Tick the box to agree to the terms first.'
    case 'terms_changed':
      return 'The terms have just changed. Read them and tick the box again.'
    case 'bad_phone':
      return 'Check the phone number, or leave it blank.'
    case 'signed_out':
      return "This phone is signed out. Enter your email and we'll send you a code."
    case 'off':
      return "Booking with a 5-pack isn't available right now. You can still pay by card."
    case 'slow_down':
      return COPY.tooMany
    case 'try_again':
      return "That didn't go through, and nothing has changed. Try again in a moment, or pay by card."
    case 'unknown':
      return "We couldn't confirm that. Reload My bookings in a minute to check."
    default:
      // A pack refusal: the page renders refusalText with the slot's context instead.
      return "This pack can't pay for that booking. You can still pay by card."
  }
}

/** A pack row's paid line: "Paid with Badminton 5-pack · 1 credit". */
export function rowPaidWithPack(packName: string, credits: number): string {
  return `Paid with ${packName} · ${creditsText(credits)}`
}

/** A pack row's cancel line, while self-cancel is open. */
export function rowPackCancelBy(cancelByText: string): string {
  return `Cancel by ${cancelByText} to get the credit back.`
}

/** A pack row inside the cutoff (design §8.3): "Under 24 hours — call 484-252-2523". */
export function rowPackTooLate(phone: string, hours = DEFAULT_CUTOFF_HOURS): string {
  return `Under ${hours} hours — call ${phone}`
}

/**
 * A cancelled pack row (design §8.3): "Cancelled · credit returned", or "Cancelled by the
 * club — credit returned" for a desk cancel. "credits" when the booking used several.
 */
export function rowPackCancelled(by: 'you' | 'club' | null, creditsReturned: number | null): string {
  const what = creditsReturned !== null && creditsReturned > 1 ? 'credits returned' : 'credit returned'
  return by === 'club' ? `Cancelled by the club — ${what}` : `Cancelled · ${what}`
}

/**
 * The cancel sheet for a pack row (cancel.html step 2, design §8.3). A booking of several
 * courts (or lanes) or hours reads in the plural — "You get back 4 credits. The courts go
 * back on sale straight away. Your credits keep your pack's date: …" — since a series is
 * cancelled whole (owner, 2026-10-18).
 */
export function packConfirmText(
  credits: number,
  validUntilText: string | null,
  courts = 1,
  unit: 'court' | 'lane' = 'court',
): string {
  const goes = `The ${unitText(unit, courts)} ${courts === 1 ? 'goes' : 'go'} back on sale straight away.`
  const keeps = validUntilText
    ? ` Your ${credits === 1 ? 'credit keeps' : 'credits keep'} your pack's date: valid until ${validUntilText}.`
    : ''
  return `Cancel this booking? You get back ${creditsText(credits)}. ${goes}${keeps}`
}

/** A pack cancel's outcome: "Cancelled. Credit is back. Badminton 5-pack 3 of 5 left · valid until Nov 29." */
export function packCancelledMessage(view: CancelView): string {
  const p = view.pack
  const line = p
    ? ` ${p.name} ${ofLeft(p.creditsLeft, p.creditsTotal)} left${p.validUntilText ? ` · valid until ${p.validUntilText}` : ''}.`
    : ''
  const many = view.creditsReturned !== undefined && view.creditsReturned > 1
  if (view.status === 'already_cancelled') {
    return `Already cancelled. The ${many ? 'credits are' : 'credit is'} back on your pack.${line}`
  }
  return `Cancelled. ${many ? 'Credits are back.' : 'Credit is back.'}${line}`
}

/* ── buying (design §8.2) ─────────────────────────────────────────────────────────── */

/** "Per hour $40.00 — peak hours are $45.00 by card" (the card part only when it is dearer). */
export function perHourLine(o: Pick<OfferView, 'perHourCents' | 'cardPeakCents'>): string {
  const base = `Per hour ${money(o.perHourCents)}`
  return o.cardPeakCents !== null && o.cardPeakCents > o.perHourCents
    ? `${base} — peak hours are ${money(o.cardPeakCents)} by card`
    : base
}

/** "What you get", in order (design §8.2). */
export function whatYouGet(o: Pick<OfferView, 'credits' | 'sport'>, windowDays: number, unusedMonths: number): string[] {
  const unit = unitForSport(o.sport)
  return [
    `${o.credits} bookings of one ${unit} for one hour. Two ${unit}s, or two hours, use two.`,
    "Any hour we're open — peak included.",
    `Use within ${windowDays} days of your first game. The clock doesn't start until you play.`,
    `Unused, a pack expires ${unusedMonths} months after purchase.`,
    `Cancel up to ${DEFAULT_CUTOFF_HOURS} hours before and the credit comes back.`,
    'No password: book with your email and a code we send you.',
  ]
}

/** "Pay $200.00". */
export function payButton(cents: number): string {
  return `Pay ${money(cents)}`
}

/** Why Pay did not open Stripe. Nothing was charged in any of these. */
export function checkoutMessage(
  error: 'bad_email' | 'terms_required' | 'terms_changed' | 'bad_sport' | 'club_not_payable' | 'off' | 'slow_down' | 'try_again',
  phone: string = FALLBACK_PHONE,
): string {
  switch (error) {
    case 'bad_email':
      return COPY.badEmail
    case 'terms_required':
      return 'Tick the box to agree to the 5-pack terms.'
    case 'terms_changed':
      return 'The 5-pack terms have just changed. Read them and tick the box again.'
    case 'bad_sport':
      return 'Choose a sport.'
    case 'club_not_payable':
    case 'off':
      return `5-packs can't be bought online right now. Please call ${phone}.`
    case 'slow_down':
      return COPY.tooMany
    default:
      return `That didn't go through, and you haven't been charged. Try again in a minute, or call ${phone}.`
  }
}

/** "60 days from your first game" — the ready screen's Valid row. */
export function validWindowText(windowDays: number): string {
  return `${windowDays} days from your first game`
}

/** "$200.00 by card". */
export function paidByCard(cents: number): string {
  return `${money(cents)} by card`
}

/** The ready page after 30 seconds of "setting up" (design §8.2). */
export function purchasePendingLate(masked: string | null, phone: string = FALLBACK_PHONE): string {
  return `Your receipt is on its way${masked ? ` to ${masked}` : ''}. Not there in 10 minutes? Call ${phone}.`
}

/** The ready page when the platform cannot match the Checkout (state 'unknown', or a bad ?cs=). */
export function purchaseUnknown(phone: string = FALLBACK_PHONE): string {
  return `We can't find that payment yet. If you paid, your receipt is on its way. Questions? Call ${phone}.`
}
