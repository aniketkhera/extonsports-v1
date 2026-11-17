// Every sentence a partner reads on extonsports.com/academies, 2026-11-16 (orangish-app
// docs/academy-page.md; the approved mockup .claude/plans/academy-page/academy-page.html).
// Pure.
//
// One file so the wording is reviewed in one place, and so its rules are testable:
//   • ONE ANSWER BEFORE SIGN-IN (D1): the request screen says the same sentence for every
//     address, academy or not — "If this address is on our academy list…" — so the page never
//     reveals who is a partner. Nothing here takes the typed address.
//   • NOTHING IS "ADDED" UNTIL THE PLATFORM SAYS SO. A refusal says "Nothing was added"; a
//     doubt says "press again — it won't add the time twice" (the request id makes that true,
//     lib/academies/view.ts AddView); only a per-court ok says added.
//   • NO CANCEL HERE (D6): the page books and extends; cancelling is an email to Aniket.
//
// Unit words come from the platform's partner.unit — "court" for PBA, "lane" for CCCA — so
// one sentence serves both, and the partner's name, billing words and rates are data.

import { money } from '../my-bookings/copy'
import type { AddRow, AddView, ExtendCourt, ExtendGroup, PartnerKey, PricedRate, Rate, RefuseReason, Unit, Use } from './view'
import { addDays, clockText, courtsText, dayMonth, dayShort, rangeText } from './view'

export { money }

/** Where cancellations go (D6). The owner's own address, shown on the page by design. */
export const CANCEL_EMAIL = 'aniket@extonsports.com'

export const ACADEMY_COPY = {
  // The page's heading before sign-in, and with " · Exton Sports Center" its <title>
  // (app/academies/layout.tsx; the test pins the two together).
  title: 'Academy page',
  lead: "For Exton's academy partners. Enter your academy's email address and we'll send you a link to your page: your upcoming court time, extend a session, and book more.",
  emailLabel: 'Academy email',
  sendButton: 'Email me a link',
  sending: 'Sending…',
  sentHeading: 'Check your email',
  // ⛔ ALWAYS this, whatever the platform found (D1's own words, then the mockup's). 30 days,
  // not the mockup's 90: D1 settled 30 for a session that can add charges.
  sent: "If this address is on our academy list, a sign-in link is on its way. Open it on this phone — it keeps this phone signed in for 30 days. On another phone? Enter the 6‑digit code from the email.",
  haveCode: 'I have a code',
  codeLead: "Enter your academy's email and the 6‑digit code from our email.",
  codeLabel: '6‑digit code', // U+2011, a hyphen that never breaks the line after "6"
  codeButton: 'Continue',
  checking: 'Checking…',
  codeError: "That code didn't work. Check it, or ask for a new link.",
  badEmail: 'Check the email address.',
  tooMany: 'Too many tries. Wait a few minutes and try again.',
  sendNew: 'Send a new link',
  openLead: 'Tap to open your academy page on this phone.',
  openButton: 'Open my academy page',
  opening: 'Opening…',
  expired: 'This link has expired or has already been used.',
  signedOut: "This phone is signed out. Enter your academy's email to get a new link.",
  off: "The academy page isn't available right now.",
  signedInAs: 'Signed in on this phone as ',
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  onNow: 'On now',
  justEnded: 'Just ended',
  extendKicker: 'Extend',
  extendFine: "The lights stay on to the new end time. We'll email you a confirmation.",
  legendYours: 'Yours',
  legendFree: 'Free',
  legendTaken: 'Taken',
  legendPicked: 'Picked',
  earlier: 'Earlier',
  later: 'Later',
  loading: 'Loading…',
  // A page left open past club-local midnight asked for yesterday (view.ts DayResult 'stale').
  staleDay: 'The date has changed since this page was opened. Updating it…',
  tryAgain: 'Try again',
  clear: 'Clear',
  adding: 'Adding…',
  notBilled: 'Not billed',
  showNext: 'Show the next 7 days',
  // D11, PBA only: §3.2 of PBA's licence keeps extra time at Exton's discretion.
  discretion: 'Extra court time is subject to availability. Exton may decline or withdraw it.',
} as const

/** "Exton Sports Center · Academy page" — the signed-in page's kicker. */
export const kicker = (clubName: string) => `${clubName} · ${ACADEMY_COPY.title}`

export const platformDown = (phone: string) =>
  `We couldn't send that just now. Try again in a minute, or call ${phone}.`
export const pageUnavailable = (phone: string) =>
  `We can't show your academy page right now. Try again in a minute, or call ${phone}.`
export const gridUnavailable = (unit: Unit) => `We can't show free ${unit}s right now.`
/**
 * Book more when the platform sent no figure for the day (view.ts Rate: CCCA past its
 * season). Without an amount D6's confirm line cannot be written, so nothing can be pressed;
 * this says why, rather than leaving a grid that goes nowhere.
 */
export const noRate = (unit: Unit) => `This page can't price extra ${unit} time on this day, so it can't add any. Email Aniket to book it.`

/** "Coaching", "Open play". */
export function wordForUse(use: Use): string {
  return use === 'coaching' ? 'Coaching' : 'Open play'
}

/** $30 for whole dollars, $27.50 otherwise — the switch's and the billing line's short form. */
export function moneyShort(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : money(cents)
}

/** "Coaching · $30" — one side of PBA's switch (mockup); the word alone with no figure. */
export const choiceForUse = (use: Use, centsPerHour: number | null) =>
  centsPerHour === null ? wordForUse(use) : `${wordForUse(use)} · ${moneyShort(centsPerHour)}`

/** "1 court-hour", "½ lane-hour", "1½ court-hours", "4 court-hours". Minutes summed over courts. */
export function unitHours(unit: Unit, totalMinutes: number): string {
  const halves = Math.round(totalMinutes / 30)
  const whole = Math.floor(halves / 2)
  const half = halves % 2 === 1
  const n = `${whole === 0 && half ? '' : whole}${half ? '½' : ''}`
  return `${n} ${unit}-${halves <= 2 ? 'hour' : 'hours'}`
}

/** "at your coaching rate" (PBA) / "at $40 a lane-hour" (CCCA) — the extend summary's tail. */
function rateWords(unit: Unit, rate: PricedRate): string {
  return rate.use ? `at your ${wordForUse(rate.use).toLowerCase()} rate` : `at ${moneyShort(rate.centsPerHour)} a ${unit}-hour`
}

/** The confirm line above every button (D6, word for word). */
export const confirmLine = (cents: number) => `This adds ${money(cents)} to your account. It can't be cancelled here.`

/* ── On now: extend ─────────────────────────────────────────────────────────── */

/** "Courts 1–3 · until 9:30 PM", or "· ended 9:30 PM" in the ten minutes after (D4). */
export function extendHeadline(group: ExtendGroup, unit: Unit, nowIso: string, tz: string): { tag: string; text: string } {
  const label = group.courtsLabel ?? courtsText(unit, group.courts.map((c) => c.label))
  const ended = Date.parse(nowIso) >= Date.parse(group.parentEnd)
  const at = clockText(group.parentEnd, tz)
  return ended
    ? { tag: ACADEMY_COPY.justEnded, text: `${label} · ended ${at}` }
    : { tag: ACADEMY_COPY.onNow, text: `${label} · until ${at}` }
}

/** The line under the headline: what the session is. */
export function sessionSub(partner: PartnerKey, unit: Unit, use: Use | null): string {
  if (partner === 'pba' && use) return `${wordForUse(use)} session`
  return `Your ${unit} time`
}

export const extendChip = (minutes: 30 | 60) => (minutes === 30 ? '+30 min' : '+1 hour')

/** The note under one court's chips: how long it is free, or why it can't be extended. */
export function extendNote(court: ExtendCourt, tz: string): string {
  if (court.options.some((o) => o.ok)) {
    return court.freeUntil ? `Free until ${clockText(court.freeUntil, tz)}` : 'Free'
  }
  const no = court.options.find((o) => !o.ok)
  switch (no?.reason) {
    case 'booked_from':
      return no.at ? `Booked from ${clockText(no.at, tz)} — can't extend` : "Booked — can't extend"
    case 'midnight':
      return "Can't run past midnight"
    case 'closed':
      return "The club is closed then — can't extend"
    case 'season_end':
      return "Past the end of your season — can't extend"
    case 'window':
      return "Outside the booking window — can't extend"
    default:
      return "Can't extend"
  }
}

/** The extend summary: "Court 1 to 10:30 PM · 1 court-hour" / "$30.00, added to your weekly
 *  invoice at your coaching rate" (mockup). */
export function extendSummary(
  unit: Unit, courtLabels: string[], newEndIso: string, minutes: number, cents: number, billing: string, rate: PricedRate, tz: string,
): { head: string; hours: string; money: string } {
  return {
    head: `${courtsText(unit, courtLabels)} to ${clockText(newEndIso, tz)}`,
    hours: unitHours(unit, minutes * courtLabels.length),
    money: `${money(cents)}, added to your ${billing} ${rateWords(unit, rate)}`,
  }
}

export const extendButton = (unit: Unit, courtLabels: string[]) => `Extend ${courtsText(unit, courtLabels, true)}`

/** Courts a change of length took out of the pick, said before the press. */
export function droppedNote(unit: Unit, labels: string[], minutes: 30 | 60): string {
  const one = labels.length === 1
  return `${courtsText(unit, labels)} ${one ? "isn't" : "aren't"} free for ${extendChip(minutes)}, so ${one ? "it's" : "they're"} no longer picked.`
}

/* ── Book more ──────────────────────────────────────────────────────────────── */

export const bookHeading = (unit: Unit) => `Book more ${unit}s`
export const pickHint = (unit: Unit) =>
  `Tap a free half-hour to pick it. Tap more on the same ${unit} to make it longer (up to 2 hours), or the same times on another ${unit}.`

/** "Court 2 · Sat 21 Nov · 6:00–7:00 PM · Coaching" / "1 court-hour · $30.00, added to your
 *  weekly invoice" (mockup). */
export function bookSummary(
  unit: Unit, courtLabels: string[], date: string, range: string, use: Use | null, minutes: number, cents: number, billing: string,
): { head: string; tail: string } {
  return {
    head: `${courtsText(unit, courtLabels)} · ${dayShort(date)} · ${range}${use ? ` · ${wordForUse(use)}` : ''}`,
    tail: `${unitHours(unit, minutes * courtLabels.length)} · ${money(cents)}, added to your ${billing}`,
  }
}

export const bookButton = (unit: Unit, courtLabels: string[]) => `Book ${courtsText(unit, courtLabels, true)}`

/* ── Upcoming ───────────────────────────────────────────────────────────────── */

export const upcomingHeading = (unit: Unit) => `Your upcoming ${unit} time`
export const upcomingEmpty = (unit: Unit) => `No ${unit} time booked in the next 14 days.`

/** "Today · Mon 16 Nov" or "Tue 17 Nov". */
export function dayHeading(date: string, today: string): string {
  return date === today ? `Today · ${dayShort(date)}` : dayShort(date)
}

/** "Courts 1–3 · Coaching" — courts, then the label (or the use, when there is no label). */
export function upcomingWhat(unit: Unit, courtLabels: string[], label: string | null, use: Use | null): string {
  const what = label ?? (use ? wordForUse(use) : null)
  return `${courtsText(unit, courtLabels)}${what ? ` · ${what}` : ''}`
}

export const addedTag = (ymd: string) => `Added ${dayMonth(ymd)}`

/** "Your regular hours continue to Wed 31 Mar 2027." — the year only when it is not this one. */
export function regularUntilLine(until: string, today: string): string {
  const year = until.slice(0, 4) !== today.slice(0, 4) ? ` ${until.slice(0, 4)}` : ''
  return `Your regular hours continue to ${dayShort(until)}${year}.`
}

/** Whether there is anything past the first week to show. */
export const hasLaterWeek = (dates: string[], today: string) => dates.some((d) => d >= addDays(today, 7))

/* ── the foot of the page ───────────────────────────────────────────────────── */

/**
 * D6, word for word, split around the address so it renders as a mailto: link. CCCA's
 * licence (§3.4) asks 48 hours' notice to release lane time, and the line says so.
 */
export function cancelLine(partner: PartnerKey): { before: string; email: string; after: string } {
  return {
    before: 'To cancel or change any of this, email Aniket at ',
    email: CANCEL_EMAIL,
    after: partner === 'ccca' ? " (48 hours' notice to release lane time — your agreement §3.4)." : '.',
  }
}

/** The billing line: whose rates, and where the charges go (D7). Never a card. */
export function billingLine(unit: Unit, rates: Rate[], billing: string): string {
  const flat = rates.length === 1 && rates[0].use === null ? rates[0] : null
  if (flat) {
    const Unit = unit[0].toUpperCase() + unit.slice(1)
    // No figure (view.ts Rate): say where charges go, never a rate the platform did not give.
    if (flat.centsPerHour === null) return `${Unit} time goes on your ${billing}. Nothing is charged to a card.`
    return `${Unit} time is at your agreement's ${moneyShort(flat.centsPerHour)} a ${unit}-hour and goes on your ${billing}. Nothing is charged to a card.`
  }
  return `Prices are your agreement's additional-hour rates. Nothing is charged to a card; it all goes on your ${billing}.`
}

/* ── after a press ──────────────────────────────────────────────────────────── */

/** One court's line after the platform answered (§3.3: courts succeed or fail one by one). */
export function resultLine(row: AddRow, label: string, tz: string): string {
  if (row.ok) return `${label}: added, ${rangeText(row.start, row.end, tz)} · ${money(row.amountCents)}`
  switch (row.reason) {
    case 'taken':
      return `${label} was just booked — nothing added for it`
    case 'daily_cap':
      return `${label}: past what this page adds in one day — nothing added for it`
    case 'closed':
      return `${label}: the club is closed then — nothing added for it`
    case 'midnight':
      return `${label}: can't run past midnight — nothing added for it`
    default:
      return `${label} couldn't be added — nothing added for it`
  }
}

/** The line under the per-court lines. */
export function resultTotal(v: Extract<AddView, { status: 'done' }>): string {
  if (!v.results.some((r) => r.ok)) return 'Nothing was added.'
  return v.emailed
    ? `${money(v.totalCents)} added to your account. We've emailed you a confirmation.`
    : `${money(v.totalCents)} added to your account. The confirmation email didn't go out — it's all listed under your upcoming time.`
}

const REFUSED: Record<RefuseReason, string> = {
  window: 'That date is outside the dates this page books.',
  past: 'That time has already started. Pick a later one.',
  season_end: 'That runs past the end of your current season.',
  midnight: "Time can't run past midnight.",
  closed: 'The club is closed then.',
  not_yours: "That session isn't one of yours, so it can't be extended here.",
  bad_use: 'Pick Coaching or Open play first.',
  daily_cap: 'That is more than this page adds in one day. Email Aniket for more.',
  not_extendable: "That session can't be extended from here any more. Book the time under Book more instead.",
}

/**
 * Every answer but `done`, as one sentence. The definite ones end "Nothing was added."; the
 * in-doubt ones tell the partner to press again, which is safe because the retry carries the
 * same request id.
 */
export function addMessage(v: AddView): string {
  switch (v.status) {
    case 'done':
      return resultTotal(v)
    case 'refused':
      return `${v.reason ? REFUSED[v.reason] : "We couldn't add that."} Nothing was added.`
    case 'bad_request':
      return 'Something went wrong and nothing was added. Reload the page and try again.'
    case 'signed_out':
      return 'This phone has been signed out, and nothing was added. Reload the page to sign in again.'
    case 'off':
      return "The academy page isn't available right now. Nothing was added."
    case 'slow_down':
      return "Too many tries. Wait a few minutes, then press again — it won't add the time twice."
    default:
      return "We couldn't confirm that. Press again — it won't add the time twice."
  }
}
