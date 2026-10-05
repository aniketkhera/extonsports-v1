/* The Philadelphia Badminton academy timetable, as published on the academies row.
   ───────────────────────────────────────────────────────────────────────────────
   WHERE THIS COMES FROM, AND WHY IT IS TYPED OUT RATHER THAN FETCHED.

   These are PBA's Committed Hours under §3.1 of the Badminton Court License
   Agreement (executed 2026-09-23), split into coaching and open play by §3.8.
   They are a CONTRACT TERM, not an availability feed: they do not change when a
   court frees up, and they must not drift with the booking system. The platform
   holds the same hours as `events` rows so the courts are blocked from member
   booking, but the two are independent on purpose — if they ever disagree, the
   contract is right and the events are wrong.

   Hand-verified against the platform on 2026-10-05, after the Sunday move below.

   ⚠️ SUNDAY MORNING IS 7–9am, NOT 9–11am. Moved by email agreement between Aniket
   and Syam Anand under §3.6 on 2026-10-04 — which lets the days and times vary by
   email without amending the agreement, so long as the weekly total and the
   First/Second Block split are unchanged. SATURDAY WAS NOT MOVED. The contract and
   lib/floor.ts both still write "Sat & Sun 9–11am" as a pair; that pairing is now
   wrong for Sunday and right for Saturday. Do not "fix" the asymmetry.

   §3.9(a) blacks out 25 Dec – 1 Jan every year. Not shown: a visitor reading this
   in October does not need it, and a stale holiday notice is worse than none. */

export type PbaSlot = {
  day: string
  /** §3.8 First Block — instructed sessions with a coach present. */
  coaching: string | null
  /** §3.8 Second Block — unstructured play PBA monitors, no coach. */
  openPlay: string | null
}

/** The timetable as it stands TODAY. See PBA_EXPANDS for what changes on 30 Nov. */
export const PBA_SCHEDULE: PbaSlot[] = [
  { day: 'Mon', coaching: '5:30–7:30pm', openPlay: null },
  { day: 'Wed', coaching: '5:30–7:30pm', openPlay: '7:30–9:30pm' },
  { day: 'Sat', coaching: '9–11am', openPlay: '4–6pm' },
  { day: 'Sun', coaching: '7–9am', openPlay: '4–6pm' },
]

/* The licence ramps in three steps — 42 court-hours a week in October, 48 in
   November, 84 from 30 Nov — and only the last step changes what a visitor sees,
   because it is the one that adds DAYS rather than hours to days already listed.
   November adds Monday evening hours to a day already on the table above, so
   publishing a third variant would be noise. This line is the whole difference. */
export const PBA_EXPANDS = 'From 30 November, coaching runs Monday to Friday, 5:30–9:30pm.'

/** All three courts, every session — §1.8. */
export const PBA_COURTS = 'All three badminton courts'
