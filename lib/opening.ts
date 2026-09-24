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

/** The waitlist eyebrow, already uppercase. */
export const OPENING_EYEBROW = 'OPENING OCTOBER 5, 2026'

/** The first bookable hour. The club runs 24/7 from opening day, so midnight
    is technically first, but 06:00 is the first hour anyone wants — and it is
    what the hero's "first slot" column advertises. Held on OPENING_DATE above
    so the column can format it exactly like a live slot. */
export const OPENING_FIRST_HOUR = OPENING_DATE.toISOString()

/** True once the doors are open. Evaluated per render, so no rebuild needed. */
export function isOpen(now: Date = new Date()): boolean {
  return now.getTime() >= OPENING_DATE.getTime()
}
