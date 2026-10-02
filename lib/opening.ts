// Opening date, in one place.
//
// The date used to be spelled out as prose ("late-August 2026") in the nav
// chip, the waitlist header and the fixed CTA banner, which meant a slip in the
// schedule needed three edits in three different tones of voice. It is now one
// constant and a handful of formatters, so moving the date is a one-line change.
//
// Doors open 06:00 on Monday 5 October 2026. The copy used to hedge
// ("mid-September") so a slip of a few days would not make it a lie; it now
// names the day, because the date is committed and a vague month reads as
// drift once a firm one has been announced.

export const OPENING_DATE = new Date('2026-10-05T06:00:00-04:00')

/** "October 5, 2026" — long form, for body copy and legal pages. */
export const OPENING_LONG = 'October 5, 2026'

/** "Oct 5, 2026" — for the nav chip, where horizontal space is tight. */
export const OPENING_SHORT = 'Oct 5, 2026'

/** "Monday 5 October, 6:00 AM" — the doors moment, for the rate card's
    pre-opening CTA, where a reader needs the DAY and the HOUR and not the
    year. A literal rather than a toLocaleDateString() off OPENING_DATE, to
    match the two constants above and to keep it out of reach of a server and
    a browser disagreeing about locale mid-hydration. Move it with them. */
export const OPENING_DOORS = 'Monday 5 October, 6:00 AM'

/** The waitlist eyebrow, already uppercase. */
export const OPENING_EYEBROW = 'OPENING OCTOBER 5, 2026'

/** The first bookable hour. The club runs 24/7 from opening day, so midnight
    is technically first, but 06:00 is the first hour anyone wants — and it is
    what the hero's "first slot" column advertises. Held on OPENING_DATE above
    so the column can format it exactly like a live slot. */
export const OPENING_FIRST_HOUR = OPENING_DATE.toISOString()

/**
 * When each sport's COURTS become bookable — which is not one date.
 *
 * The doors open Mon 5 Oct, but the three sports come online over that first
 * week (confirmed by Aniket 2026-10-02): badminton Tue 6 Oct, cricket Thu
 * 8 Oct. Squash is not staged — it is ready on day one, so it takes
 * OPENING_DATE itself.
 *
 * ⚠️ NOT the academy start dates, which are a different thing on a different
 * part of the page: Philadelphia Badminton begins Mon 5 Oct and Chester County
 * Cricket Mon 12 Oct (see the ACADEMY_PARTNERS entries in Hero.tsx). A sport
 * being bookable and its academy running are independent — cricket LANES open
 * on the 8th, four days before the academy that holds two of them starts.
 *
 * Keys MUST match a `sport` in COURT_RATES; the rate card joins the two by name.
 */
export const SPORT_BOOKING_OPENS: Record<string, Date> = {
  Squash: OPENING_DATE,
  Badminton: new Date('2026-10-06T06:00:00-04:00'),
  Cricket: new Date('2026-10-08T06:00:00-04:00'),
}

/** "Tue 6 Oct" — the short form the rate card prints beside a sport. */
export const SPORT_BOOKING_OPENS_LABEL: Record<string, string> = {
  Squash: 'Mon 5 Oct',
  Badminton: 'Tue 6 Oct',
  Cricket: 'Thu 8 Oct',
}

/** True once THIS sport can be booked. Unknown sport -> fall back to the club. */
export function sportBookingOpen(sport: string, now: Date = new Date()): boolean {
  const d = SPORT_BOOKING_OPENS[sport] ?? OPENING_DATE
  return now.getTime() >= d.getTime()
}

/** The sports that are not bookable yet, in rate-card order. */
export function sportsNotYetOpen(sports: string[], now: Date = new Date()): string[] {
  return sports.filter((s) => !sportBookingOpen(s, now))
}

/**
 * The date to put ON a booking button while booking is not yet possible.
 *
 * Returns null the moment ANY sport is bookable — from then on the button
 * should just say "Book a court", because booking genuinely works even if
 * cricket is still a few days out. Before that it returns the SOONEST of the
 * three, which is the only date a single button can honestly carry.
 *
 * The rate card does not use this: it sits beside the full per-sport line, so
 * a date on its button would repeat what is already next to it.
 */
export function bookingOpensLabel(now: Date = new Date()): string | null {
  const entries = Object.entries(SPORT_BOOKING_OPENS)
  if (entries.some(([s]) => sportBookingOpen(s, now))) return null
  const soonest = entries.sort((a, b) => a[1].getTime() - b[1].getTime())[0]
  return soonest ? (SPORT_BOOKING_OPENS_LABEL[soonest[0]] ?? null) : null
}

/** True once the doors are open. Evaluated per render, so no rebuild needed. */
export function isOpen(now: Date = new Date()): boolean {
  return now.getTime() >= OPENING_DATE.getTime()
}
