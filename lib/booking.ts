// Where "book" goes.
//
// Court booking and class booking both live on the platform, behind sign-in.
// Until the club opens there is nothing to book, so every booking CTA falls
// back to the waitlist rather than dropping someone on a login screen for a
// club that has no slots yet.

import { isOpen } from './opening'

const APP_URL = (process.env.NEXT_PUBLIC_ORANGISH_APP_URL || 'https://app.orangish.io').replace(/\/$/, '')

export const BOOK_COURTS_URL = `${APP_URL}/book/courts`
/**
 * ⛔ NOT /book/events. That is the platform's club EVENTS page — tournaments,
 * socials, facility events — and it reads the `events` table. A class is a
 * `group_sessions` row under a `squad_programs` programme, and those live at
 * /book/squads. So the Bollywood Dance card, whose price and timetable are read
 * live from the platform, would have sent people to a page that could never
 * list the class they had just read the price of.
 *
 * Nothing caught it because the button is still gated behind isOpen() below and
 * has never once used this URL — the destination has been wrong since the day
 * it shipped, silently, waiting for the doors to open.
 *
 * No club id needed: /book/squads is cross-club and readable without a
 * membership, so a visitor arriving cold from here signs in and sees the class.
 */
export const BOOK_CLASSES_URL = `${APP_URL}/book/squads`

/**
 * The Bollywood Dance programme's OWN page, and where the class CTA now points.
 *
 * BOOK_CLASSES_URL above is the generic cross-club class list — still correct
 * for Featured.tsx, which is not about one programme. This one names the class:
 * it opens on the next three dates with a Register button each, plus both
 * packs, and it READS without signing in. A visitor who has just read "$25
 * drop-in, Tuesdays & Thursdays" lands on that, not on a list of every club's
 * squads with a login wall in front of it.
 *
 * ⚠️ 'bollywood' IS HARDCODED AND CANNOT BE DERIVED. programSlug() in
 * lib/club-schedule.ts turns "Bollywood Dance" into 'bollywood-dance', which
 * 404s, and /api/public/clubs/<slug> does not publish the programme slug at all
 * (verified against the live payload 2026-09-09: name, type, rates, packs,
 * currency — no slug). The durable fix is to add `slug` to that endpoint's
 * programs[]; until then this string is the join, and it is load-bearing.
 *
 * The platform keeps retired slugs resolving (squad_programs.previous_slugs,
 * plus a trigger), so a rename on that side does not immediately break this —
 * but nothing here would notice if it did.
 *
 * Verified live 2026-09-09: https://app.orangish.io/c/bollywood → HTTP 200.
 * It 404'd until orangish-app #564 merged, which is why this constant could not
 * ship before that did.
 */
export const BOLLYWOOD_CLASS_URL = `${APP_URL}/c/bollywood`

/** The booking CTA target, and whether it leaves the site. */
export function bookingTarget(url: string): { href: string; external: boolean } {
  return isOpen() ? { href: url, external: true } : { href: '#waitlist', external: false }
}
