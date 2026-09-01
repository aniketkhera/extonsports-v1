// Opening date, in one place.
//
// The date used to be spelled out as prose ("late-August 2026") in the nav
// chip, the waitlist header and the fixed CTA banner, which meant a slip in the
// schedule needed three edits in three different tones of voice. It is now one
// constant and a handful of formatters, so moving the date is a one-line change.
//
// Doors open 06:00 on Monday 21 September 2026. The chips and banner still say
// "mid-September" — deliberately softer than the exact day, so the date can
// slip a week without the copy becoming a lie — while the hero's first-slot
// column shows the precise hour, because a bookable slot has to be exact.

export const OPENING_DATE = new Date('2026-09-21T06:00:00-04:00')

/** "mid-September 2026" — long form, for body copy and legal pages. */
export const OPENING_LONG = 'mid-September 2026'

/** "Mid-Sept 2026" — for the nav chip, where horizontal space is tight. */
export const OPENING_SHORT = 'Mid-Sept 2026'

/** The waitlist eyebrow, already uppercase. */
export const OPENING_EYEBROW = 'OPENING MID-SEPTEMBER 2026'

/** The first bookable hour. The club runs 24/7 from opening day, so midnight
    is technically first, but 06:00 is the first hour anyone wants — and it is
    what the hero's "first slot" column advertises. Held on OPENING_DATE above
    so the column can format it exactly like a live slot. */
export const OPENING_FIRST_HOUR = OPENING_DATE.toISOString()

/** True once the doors are open. Evaluated per render, so no rebuild needed. */
export function isOpen(now: Date = new Date()): boolean {
  return now.getTime() >= OPENING_DATE.getTime()
}
