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

/**
 * How far ahead a CARD booking opens at Exton: the platform's locations.court_booking_window_days
 * (30). The /court-packs "Booking and changes" box says it, beside the packs' own horizons
 * (2026-10-22, Aniket: "let's make the pack bookings upto 60 days for 5 pack and 120 days for 10
 * pack.."), and the pack pages offer "Pay by card" only inside it (cardOpenOn, below). The
 * platform's offers and quote answers do not carry the club's window, so it is mirrored here
 * as DEFAULT_CUTOFF_HOURS is; a change to the column needs this changed too. The packs' own
 * horizons are never written here — they are each offer's windowDays.
 */
export const CARD_WINDOW_DAYS = 30

/**
 * Whether the app's form can book `date` (club-local YYYY-MM-DD) BY CARD, counted from the
 * club-local `today`: the last card date is today + cardDays − 1, as the app's own
 * lastBookableDate (orangish-app lib/guest-court-booking-rules.ts) counts it.
 *
 * WHY, 2026-10-22 (review of the booking horizon): a pack books up to 60 or 120 days ahead,
 * a card only 30, and the pack pages offered "Pay by card" — and a "By card $X" price and
 * ", or pay by card" sentences — for every date. The card link hands the app's form a date it
 * will not take by card, and the form moved the booking to TODAY at the same start time
 * without a word. Past this date the pack pages offer "Pick another time" instead. A
 * malformed date is treated as inside the window (the page says what it always said);
 * session.ts has already checked the parked one.
 */
export function cardOpenOn(date: string, today: string, cardDays: number = CARD_WINDOW_DAYS): boolean {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today)
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return true
  const last = new Date(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]) + Math.max(1, cardDays) - 1))
  if (Number.isNaN(last.getTime())) return true
  return date <= last.toISOString().slice(0, 10)
}

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
  // The same, naming a court pack (court pack design §8.3; "court pack" since the rename,
  // Aniket 2026-10-22) — RequestPanel shows it only while PACKS_LIVE is on (review R10,
  // 2026-10-21): until then no pack is on sale online, and the platform's own email names
  // packs only once court_packs_public is on (its A5 deviation 1). Still conditional — it
  // says the same for everyone.
  sentWithPack: "If this email has bookings or a court pack with us, we've sent a link and a 6‑digit code. Any link or code from us that hasn't expired still works. On another device? Enter the code from the email.",
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
  // A court pack series (2026-10-21): no money moved, so never "refund" or "card".
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

/* ══ COURT PACKS (2026-10-21; renamed and two sizes, 2026-10-22) ═══════════════════════
   Owner, 2026-10-20: "let's go with the implentation.." — orangish-app docs/court-packs.md
   §8 (the screens, word for word where the design gives them) and §11. Every sentence the
   pack pages show lives below, so the wording is reviewed here and the rules are testable.

   Aniket, 2026-10-22: the product is "court packs" (it was "5-packs"), sold as a 5-pack and
   a 10-pack, badminton and cricket only. The generic word is "court pack"; the offer names
   ("Badminton 10-pack") are the platform's and arrive as data. The app form's switch is
   "My court pack" — PACK_BUY_COPY.alreadyHave quotes it word for word.

   ⛔ BEFORE SIGN-IN, NOTHING SAYS WHETHER AN ADDRESS HOLDS A PACK (owner, 2026-10-18;
   design §1 "Never reveal whether an email has a pack"). PACK_SIGNIN is everything the
   pack page can show before the platform answers session 'match', and every sentence in it
   is conditional ("If this email has a court pack or bookings with us…"). "There's no court
   pack on a•••@…" exists — refusalText 'no_pack' — but only after the inbox is proved. */

/** The pack page before the platform says this device's session matches (design §8.1). */
export const PACK_SIGNIN = {
  emailLead: "Enter your email and we'll send you a 6‑digit code. No password needed.",
  emailLabel: 'Your email',
  sendCode: 'Send me a code',
  sending: 'Sending…',
  // ⛔ ALWAYS this after Send, whatever the platform found — the same sentence for every
  // address, and the same 202 behind it.
  sent: "If this email has a court pack or bookings with us, we've sent a 6‑digit code. No password needed.",
  nothingArriving: 'Nothing arriving? Check the address, or',
  buyLink: 'buy a court pack',
  // The same line while there is no buy link to offer (PACKS_LIVE off: /court-packs deploys
  // unlinked; or, since 2026-10-22, a sport with no pack on sale — squash). Its own
  // sentence, so a change to the one above cannot silently break it.
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
  title: 'Book with my court pack',
  pickFirst: 'Pick a time first.',
  bookACourt: 'Book a court',
  pickAnother: 'Pick another time',
  notYou: 'Not you?',
  termsLabel: 'I agree to the terms, disclosure and waiver for Exton Sports',
  phoneLabel: 'Mobile (optional)',
  booking: 'Booking…',
  unreachable: "We couldn't reach the booking system. Try again in a moment, or pay by card.",
  // 2026-10-22: the same, for a date past the card window (cardOpenOn) — there is no card to offer.
  unreachableNoCard: "We couldn't reach the booking system. Try again in a moment.",
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
  // My bookings: pack cards and pack rows (design §8.3).
  packsHeading: 'My court packs',
  confirmNo: 'Keep my booking',
} as const

/* Review UI-4 and UI-10, 2026-10-21: the sentences below were fixed strings in PACK_COPY and
   read in the singular on a booking that used several credits ("Cancel by … to get the
   credit back" over "You get back 2 credits"), and "court" on a cricket pack. They count
   now, the way packConfirmText already did. */

/** "credit" or "credits". */
function creditWord(n: number): string {
  return n === 1 ? 'credit' : 'credits'
}

/** The pack page's fine print under Book: "…and the credit comes back." / "…the credits come back." */
export function packFinePrint(credits: number, hours = DEFAULT_CUTOFF_HOURS): string {
  return `Cancel up to ${hours} hours before and the ${creditWord(credits)} ${credits === 1 ? 'comes' : 'come'} back.`
}

/** The booked screen's note after "Cancel this booking": "(credit back until 24 hours before)". */
export function cancelThisNote(credits: number, hours = DEFAULT_CUTOFF_HOURS): string {
  return `(${creditWord(credits)} back until ${hours} hours before)`
}

/** A pack row's Yes in the cancel sheet: "Yes, cancel — return my credit(s)". */
export function packConfirmYes(credits: number): string {
  return `Yes, cancel — return my ${creditWord(credits)}`
}

/** A pack card's button: "Book a court with my pack", "Book a lane with my pack" for cricket. */
export function bookWithMyPack(sport: string): string {
  return `Book a ${unitForSport(sport)} with my pack`
}

/**
 * A pack booking that starts inside the self-cancel cutoff (review UI-6, 2026-10-21): the
 * pack page and the booked screen say this instead of promising the credit back, since the
 * row they lead to can only say "Under 24 hours — call".
 */
export function packInsideCutoff(phone: string, credits: number, hours = DEFAULT_CUTOFF_HOURS): string {
  return `This game is less than ${hours} hours away, so it can't be cancelled online — call ${phone} to change it. A no-show uses the ${creditWord(credits)}.`
}

/**
 * The public buy page, /court-packs, and its terms (design §8.2). 2026-10-22: renamed from
 * the 5-pack, and two sizes per sport (Aniket). "Peak for off-peak." still holds for both
 * sizes: a 5-pack credit is the off-peak card price and a 10-pack credit is below it
 * (badminton $40 / $35 against $40 off-peak, cricket $55 / $50 against $55 — lib/rates.ts),
 * so the lead says "or less" rather than promising one price.
 */
export const PACK_BUY_COPY = {
  chip: 'No account needed',
  title: 'Court packs.',
  titleAccent: 'Peak for off-peak.',
  lead: "Five or ten one-hour bookings, any hour we're open — peak hours at the off-peak price, or less.",
  // /court-packs's <meta name="description">, 2026-10-25 (site review, low). It was `lead`,
  // which states the sizes and a price claim in a STATIC string that search results and link
  // previews keep long after the platform's offers change (sizes, prices and windows are all
  // court_pack_offers rows, changed with no deploy here). So it names no size and no price —
  // only what is sold and where. The sports ARE named: which sports have packs was Aniket's
  // call (2026-10-22, badminton and cricket, no squash), not a price that moves with a row;
  // when that call changes, this line changes with it. `lead` stays on the page, beside the
  // offers it describes.
  metaDescription: 'Prepaid court and lane time at Exton Sports Center — badminton and cricket.',
  sportLabel: 'Sport',
  // 2026-10-22: the second choice, under the sport — 5 credits or 10.
  sizeLabel: 'Pack',
  // 2026-10-22: the box under "What you get" (bookingAndChanges).
  changesTitle: 'Booking and changes',
  // Pay, while nothing is chosen (a ?sport= the club sells no pack for: no tile is picked).
  choose: 'Choose a pack',
  whatYouGet: 'What you get',
  emailLabel: 'Your email',
  emailHelp: 'Your pack lives on this email. To book with it, we send a code here — no password. Your receipt comes here too.',
  termsBefore: 'I agree to the',
  termsLink: 'court pack terms',
  paying: 'Opening payment…',
  finePrint: 'Card payment by Stripe. Packs are non-refundable once paid.',
  // ⚠️ Quotes the app booking form's switch label WORD FOR WORD (orangish-app
  // app/book-court/[slug]/GuestCourtBooking.tsx, "My court pack" since 2026-10-22): the
  // instruction must name a button that exists.
  alreadyHave: 'Already have a pack? Book a court and choose “My court pack” when you pay.',
  notOnSale: "Court packs aren't on sale online right now.",
  termsTitle: 'Court pack terms',
  /**
   * The line under /court-packs/terms's title, 2026-10-25 (site review, low): "Version
   * 2026-10-22-1". The page is "the version their pack records" (its header) but never said
   * which version it was, so a buyer — or the desk, on the phone — could not match the page
   * to the version a purchase stored. The version is the platform's (view.ts toOffers), as
   * text.
   */
  termsVersion: (version: string) => `Version ${version}`,
  /** /court-packs/terms when the platform is off, down or unconfigured. */
  termsUnavailable: (phone: string = FALLBACK_PHONE) =>
    `We can't show the court pack terms right now. Try again in a minute, or call ${phone}.`,
  // /my-bookings/pack/ready (design §8.2).
  readyTitle: 'Your court pack is ready',
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

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })

/** Minutes after midnight → "6:00 PM"; 24:00 (a game ending at midnight) is "12:00 AM". */
function clock12(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * The slot's time in the app booking form's own words — "6:00 PM–7:00 PM, Sun, Oct 25" —
 * from the parked selection (club-local date, HH:MM, hours). Review UI-5, 2026-10-21: the
 * guest read the form's wording one click earlier, and the platform's whenText
 * ("Sun, Oct 25 · 6:00–7:00 PM") inside the summary made four '·'-separated parts in
 * another order. Null for a selection that is not a real date, time and 1–12 hours.
 */
export function slotWhenText(sel: { date: string; startTime: string; hours: number }): string | null {
  const day = dayText(sel.date)
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(sel.startTime)
  if (!day || !t || !Number.isInteger(sel.hours) || sel.hours < 1 || sel.hours > 12) return null
  const start = Number(t[1]) * 60 + Number(t[2])
  const weekday = WEEKDAY.format(new Date(`${sel.date}T12:00:00Z`))
  return `${clock12(start)}–${clock12(start + sel.hours * 60)}, ${weekday}, ${day}`
}

/**
 * The summary box (design §8.1): "1 badminton court, 6:00 PM–7:00 PM, Sun, Oct 18 · 1 credit ·
 * By card $45.00". Shown before sign-in too — it describes the SLOT, never a pack. The time
 * is built from `sel`, the slot this site parked and the platform priced (view.ts checks the
 * answer is for its sport and credits); without one, the platform's own whenText.
 *
 * `card` false (2026-10-22: the date is past the card window, cardOpenOn) drops the
 * "· By card $45.00" part — a price for something the guest cannot do on that date.
 */
export function slotSummary(
  slot: QuoteSlot,
  sel?: { date: string; startTime: string; hours: number },
  card = true,
): string {
  const when = (sel && slotWhenText(sel)) ?? slot.whenText
  const base = `${slot.courts} ${slot.sport.toLowerCase()} ${unitText(slot.unit, slot.courts)}, ${when} · ${creditsText(slot.credits)}`
  return card ? `${base} · By card ${money(slot.cardTotalCents)}` : base
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
 * The clock sentence is the platform's (cp_window, the one implementation of the rule), and
 * so is its number of days: each pack's own window, 60 for a 5-pack and 120 for a 10-pack
 * (2026-10-22) — "7 of 10 left · valid until Feb 15 (120 days from your first game on Oct
 * 18)". Nothing here knows a window length.
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

/**
 * "Buy a badminton court pack" — the size is chosen on the buy page (2026-10-22: two sizes,
 * so the button names the product, not one of them). Only ever shown for a sport the club
 * sells packs for (lib/booking.ts packBuyUrl): never "Buy a squash court pack".
 */
export function buySportPack(sport: string): string {
  return `Buy a ${sport.toLowerCase()} court pack`
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
  // 2026-10-22: whether the page offers "Pay by card" for this date (cardOpenOn). false drops
  // the ", or pay by card" clauses: past the card window the way on is another time, and the
  // page shows "Pick another time" instead of the card link. Only false drops them.
  card: boolean
}

function sportList(sports: string[]): string {
  const s = sports.map((x) => x.toLowerCase())
  return s.length <= 1 ? (s[0] ?? 'another sport') : `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

/**
 * Why no pack can pay for this slot (design §8.1), AFTER sign-in. One sentence per reason;
 * a detail that did not arrive makes the sentence shorter, never wrong.
 *
 * too_many_credits, 2026-10-22: with a 10-pack on sale, "a pack has 5" was no longer true of
 * packs in general. The platform's maxCredits is the largest pack of this sport THIS guest
 * holds (one booking draws from one pack, never two — Aniket), so the sentence says so, in
 * that pack's real size: "…and your largest badminton pack holds 5 credits."
 */
export function refusalText(r: PackRefusalView, ctx: RefusalContext): string {
  const sport = ctx.sport.toLowerCase()
  const need = r.need ?? ctx.need
  const units = unitText(ctx.unit, 2)
  const on = dayText(ctx.date)
  // 2026-10-22: no card past the card window (RefusalContext.card), so no "or pay by card".
  const orCard = ctx.card === false ? '' : ', or pay by card'
  switch (r.reason) {
    case 'no_pack':
      return `There's no court pack on ${ctx.email ?? 'this email'}.`
    case 'wrong_sport': {
      const many = r.sports.length > 1
      return `Your court pack${many ? 's are' : ' is'} for ${sportList(r.sports)}, and this is a ${sport} ${ctx.unit}. A pack covers one sport.`
    }
    case 'too_many_credits':
      return r.maxCredits !== null
        ? `This booking needs ${creditsText(need)} and your largest ${sport} pack holds ${creditsText(r.maxCredits)}. Book fewer ${units} or hours${orCard}.`
        : `This booking needs ${creditsText(need)}, more than one ${sport} pack holds. Book fewer ${units} or hours${orCard}.`
    case 'not_enough_credits': {
      if (r.creditsLeft === null) {
        return `This booking needs ${creditsText(need)} and your ${sport} pack doesn't have enough left. Book fewer ${units} or hours${orCard}.`
      }
      const fix = r.creditsLeft === 1 ? `Book 1 ${ctx.unit} for 1 hour` : `Book fewer ${units} or hours`
      return `This booking needs ${creditsText(need)} and your ${sport} pack has ${r.creditsLeft} left. ${fix}${orCard}.`
    }
    case 'too_far_ahead':
      // 2026-10-22 (Aniket: pack bookings up to 60 days ahead for a 5-pack, 120 for a
      // 10-pack): the slot is past the furthest any of the guest's usable packs can book.
      // maxDays is the platform's — the largest horizon among those packs — never a guess.
      return r.maxDays !== null
        ? `You can book up to ${r.maxDays} days ahead with your court pack. Pick an earlier date.`
        : "You can't book that far ahead with your court pack. Pick an earlier date."
    case 'outside_window': {
      const lo = dayText(r.lo)
      const hi = dayText(r.hi)
      const tail = on ? `, and this booking is on ${on}.` : '.'
      if (lo && hi && r.lo && r.lo > ctx.today) return `Your ${sport} pack can be used from ${lo} to ${hi}${tail}`
      if (hi) return `Your ${sport} pack is valid until ${hi}${tail}`
      return `Your ${sport} pack can't be used on that date. Pick another time${orCard}.`
    }
    case 'expired': {
      const hi = dayText(r.hi)
      return hi ? `Your ${sport} court pack expired on ${hi}.` : `Your ${sport} court pack has expired.`
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
 * the /my-bookings page, where a booking that did land is listed; it never says "nothing
 * changed".
 *
 * 'unknown', 2026-10-25 (site review, low): it said "Reload My bookings in a minute", but
 * that page has been "Manage or cancel a booking" since the 2026-10-22 review fixes (COPY.title)
 * and "My bookings" now names only the home page's popup button — a different thing, which
 * emails a list. PackConfirm's button under this sentence is labelled COPY.title, so the
 * sentence is built from COPY.title too: rename the page and both follow, never one alone.
 *
 * `card` false (2026-10-22: the date is past the card window, cardOpenOn) leaves out "or pay
 * by card" / "You can still pay by card." — the page shows no card link for that date.
 */
export function bookMessage(v: BookView, phone: string = FALLBACK_PHONE, card = true): string {
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
      return card
        ? "Booking with a court pack isn't available right now. You can still pay by card."
        : "Booking with a court pack isn't available right now."
    case 'slow_down':
      return COPY.tooMany
    case 'try_again':
      return card
        ? "That didn't go through, and nothing has changed. Try again in a moment, or pay by card."
        : "That didn't go through, and nothing has changed. Try again in a moment."
    case 'unknown':
      return `We couldn't confirm that. Open “${COPY.title}” in a minute to check.`
    default:
      // A pack refusal: the page renders refusalText with the slot's context instead.
      return card ? "This pack can't pay for that booking. You can still pay by card." : "This pack can't pay for that booking."
  }
}

/** A pack row's paid line: "Paid with Badminton 5-pack · 1 credit". */
export function rowPaidWithPack(packName: string, credits: number): string {
  return `Paid with ${packName} · ${creditsText(credits)}`
}

/** A pack row's cancel line, while self-cancel is open: "…to get the credit(s) back." */
export function rowPackCancelBy(cancelByText: string, credits = 1): string {
  return `Cancel by ${cancelByText} to get the ${creditWord(credits)} back.`
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

/**
 * A pack cancel's outcome: "Cancelled. Credit is back. Badminton 5-pack 3 of 5 left · valid until Nov 29."
 *
 * 2026-10-21 (orangish-app review F5 / R8, the platform's pack.closed and pack.firstGameByText):
 *  - a CLOSED pack (refunded or disputed) gets its own sentence and never "Credit is back" —
 *    the booking is cancelled but nothing can be booked from that pack again:
 *    "Cancelled. Your Badminton 5-pack is closed, so there's no credit to use.";
 *  - a pack whose 60 days (120 for a 10-pack, 2026-10-22) have not started says when to play a first game by, never "valid
 *    until" — its date is a year out and read as a year to use the credits:
 *    "… Badminton 5-pack 5 of 5 left · play your first game by Oct 21, 2027."
 */
export function packCancelledMessage(view: CancelView): string {
  const p = view.pack
  if (p?.closed) {
    const lead = view.status === 'already_cancelled' ? 'Already cancelled.' : 'Cancelled.'
    return `${lead} Your ${p.name} is closed, so there's no credit to use.`
  }
  const when = p?.validUntilText
    ? ` · valid until ${p.validUntilText}`
    : p?.firstGameByText ? ` · play your first game by ${p.firstGameByText}` : ''
  const line = p ? ` ${p.name} ${ofLeft(p.creditsLeft, p.creditsTotal)} left${when}.` : ''
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

/**
 * "What you get", in order (design §8.2) — for ONE offer, from its own numbers. 2026-10-22:
 * the window and the unused expiry are the offer's (a 5-pack's 60 days, a 10-pack's 120),
 * no longer one page-wide number that would have told a 10-pack buyer "60 days".
 */
export function whatYouGet(o: Pick<OfferView, 'credits' | 'sport' | 'windowDays' | 'unusedMonths'>): string[] {
  const unit = unitForSport(o.sport)
  return [
    `${o.credits} bookings of one ${unit} for one hour. Two ${unit}s, or two hours, use two.`,
    "Any hour we're open — peak included.",
    `Use within ${o.windowDays} days of your first game. The clock doesn't start until you play.`,
    `Unused, a pack expires ${o.unusedMonths} months after purchase.`,
    `Cancel up to ${DEFAULT_CUTOFF_HOURS} hours before and the credit comes back.`,
    'No password: book with your email and a code we send you.',
  ]
}

/**
 * A sport tile's price (2026-10-22): the one price when the sport has one size, "from
 * $200.00" when it has several — the sizes and their prices are the row below it.
 */
export function sportTilePrice(prices: number[]): string {
  if (prices.length === 0) return ''
  const low = Math.min(...prices)
  return prices.length === 1 ? money(low) : `from ${money(low)}`
}

/**
 * A size tile, top to bottom: "10 credits", "$350.00", "$35.00 an hour" (2026-10-22), and how
 * far ahead that pack books, "Books 120 days ahead" — the offer's own windowDays (Aniket,
 * 2026-10-22: "let's make the pack bookings upto 60 days for 5 pack and 120 days for 10
 * pack.."), so a size whose window changes on the platform says so with no deploy here. Kept to
 * one short line: two tiles share a 375 px phone's row.
 */
export function sizeTile(
  o: Pick<OfferView, 'credits' | 'priceCents' | 'perHourCents' | 'windowDays'>,
): [string, string, string, string] {
  return [creditsText(o.credits), money(o.priceCents), `${money(o.perHourCents)} an hour`, `Books ${o.windowDays} days ahead`]
}

/** "a 5-pack", "an 8-pack", "an 11-pack", "an 18-pack". */
function aPack(credits: number): string {
  return `${/^(8|11|18)$/.test(String(credits)) ? 'an' : 'a'} ${credits}-pack`
}

/** [60, 120] → "60 or 120"; [60, 90, 120] → "60, 90 or 120". */
function orList(xs: (string | number)[]): string {
  const s = xs.map(String)
  return s.length <= 1 ? (s[0] ?? '') : `${s.slice(0, -1).join(', ')} or ${s[s.length - 1]}`
}

/**
 * The "Booking and changes" box on /court-packs (2026-10-22). Aniket: "let's make the pack
 * bookings upto 60 days for 5 pack and 120 days for 10 pack.. cancel and re-booking is fine."
 * In order:
 *   Book up to 60 days ahead with a 5-pack, or 120 with a 10-pack (card bookings open 30 days ahead).
 *   Every game must fall within your pack's 60 or 120 days from your first game.
 *   To change a booking, cancel it and book again.
 *   Cancel online up to 24 hours before and the credit goes back on your pack.
 *   Inside 24 hours, the desk can help: call 484-252-2523.
 *   A no-show uses the credit.
 *   A credit that comes back keeps your pack's dates.
 *
 * `sizes` are ONE sport's offers, smallest first (BuyForm passes the chosen sport's), so every
 * number in the first two lines is an offer's own windowDays — a size the platform switches
 * off, or a window it changes, changes the box with no deploy. Sizes that share one window say
 * it once ("…with a court pack"). There is no "change" button: a change is a cancel and a new
 * booking (Aniket, 2026-10-22). The last line is the approved terms' own rule (2026-10-22-1:
 * "A credit returned to the pack keeps the pack's dates"), in the box's words.
 */
export function bookingAndChanges(
  sizes: Pick<OfferView, 'credits' | 'windowDays'>[],
  phone: string = FALLBACK_PHONE,
  cardDays = CARD_WINDOW_DAYS,
  hours = DEFAULT_CUTOFF_HOURS,
): string[] {
  const windows = [...new Set(sizes.map((o) => o.windowDays))].sort((a, b) => a - b)
  // One window for every size: say it once. Otherwise each size with its own, in order:
  // "60 days ahead with a 5-pack, or 120 with a 10-pack".
  const parts = windows.length === 1
    ? [`${windows[0]} days ahead with ${sizes.length === 1 ? aPack(sizes[0].credits) : 'a court pack'}`]
    : sizes.map((o, i) => `${o.windowDays}${i === 0 ? ' days ahead' : ''} with ${aPack(o.credits)}`)
  const listed = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`
  const ahead = `Book up to ${listed} (card bookings open ${cardDays} days ahead).`
  return [
    ...(windows.length > 0
      ? [ahead, `Every game must fall within your pack's ${orList(windows)} days from your first game.`]
      : []),
    'To change a booking, cancel it and book again.',
    `Cancel online up to ${hours} hours before and the credit goes back on your pack.`,
    `Inside ${hours} hours, the desk can help: call ${phone}.`,
    'A no-show uses the credit.',
    "A credit that comes back keeps your pack's dates.",
  ]
}

/**
 * The buy page reached with a ?sport= the club sells no pack for (2026-10-22: squash, since
 * Aniket stopped squash packs): no tile is picked for the guest — quietly switching them to
 * another sport could sell a badminton pack to a squash player — and this says what IS
 * sold, from the offers themselves: "Court packs are for badminton and cricket."
 */
export function packSportsLine(sports: string[]): string {
  return `Court packs are for ${sportList(sports)}.`
}

/** "Pay $200.00". */
export function payButton(cents: number): string {
  return `Pay ${money(cents)}`
}

/** Why Pay did not open Stripe. Nothing was charged in any of these. */
export function checkoutMessage(
  error:
    | 'bad_email' | 'terms_required' | 'terms_changed' | 'bad_sport' | 'bad_size' | 'club_not_payable' | 'off'
    | 'slow_down' | 'try_again',
  phone: string = FALLBACK_PHONE,
): string {
  switch (error) {
    case 'bad_email':
      return COPY.badEmail
    case 'terms_required':
      return 'Tick the box to agree to the court pack terms.'
    case 'terms_changed':
      // 2026-10-25 (site review, low): it said "Read them and tick the box again", but the
      // form sends the terms version the PAGE loaded, so a re-tick re-sends the old version
      // and is refused again, for ever. Only a reload fetches the new terms and their
      // version; BuyForm shows a Reload button in place of Pay and clears the tick.
      return 'The court pack terms have just changed. Reload the page to read the new terms, then tick the box again.'
    case 'bad_sport':
      return 'Choose a sport.'
    case 'bad_size':
      // 2026-10-22: the platform's 400 bad_size — the size sent is not an active offer of
      // that sport (one switched off since the page loaded, most likely). Nothing charged.
      return "That pack isn't on sale right now. Reload the page and choose again."
    case 'club_not_payable':
    case 'off':
      return `Court packs can't be bought online right now. Please call ${phone}.`
    case 'slow_down':
      return COPY.tooMany
    default:
      return `That didn't go through, and you haven't been charged. Try again in a minute, or call ${phone}.`
  }
}

/** "60 days from your first game" — the ready screen's Valid row; "120 days…" for a 10-pack. */
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
