// Who has the floor, and when.
//
// ⚠️ NOTHING RENDERS THIS ANY MORE, AND IT IS KEPT ON PURPOSE. The hero
// printed it as "Hours already committed" until 2026-10-05, when the calendar
// of bookings began drawing the same contracts as blocks on the actual grid
// and the paragraph became a second, vaguer telling of what a reader can see.
//
// It stays because it is the hand-verified TRANSCRIPTION of those contracts,
// and three live comments point at it as such: BookingsCalendar.tsx here, and
// lib/court-slots.ts + lib/court-availability.ts in orangish-app, which cite
// the cricket lane-3 case to explain why they count court-hours. Delete the
// file and those references dangle. If the licences change, this is still the
// place that says what they were.
//
// ⛔ THIS IS NOT AVAILABILITY, AND THE DISTINCTION IS THE WHOLE POINT.
//
// It is the standing COMMITMENT timetable: the hours the two academy licences
// hold courts, which is a fact about contracts rather than about demand. That
// makes it the one court-occupancy signal this site can tell the truth with
// today — it is true before the doors open, true on a dead Tuesday, and true
// without a single call to the platform.
//
// Why it exists instead of a live feed. The hero's rate card has had a fully
// built "next free slot" column since August, parked behind SHOW_NEXT_SLOT in
// Hero.tsx because the upstream endpoint (GET /api/public/next-availability)
// does not exist. When the data WAS modelled out against the live database on
// 2026-10-02, a second problem showed up behind the first: with ten courts and
// almost nothing booked, every honest availability number in opening week reads
// "everything is free" — which a visitor reads as "nobody goes here". A real
// feed would be accurate and actively unhelpful. The commitment timetable is
// the opposite: it is the only part of the picture that is both true and worth
// reading on day one.
//
// VERIFIED 2026-10-02 against Supabase project krbfwstegmkmsnyvogyy, by joining
// events → event_courts → court_occupancy for location
// f9d70a9d-ca32-4dc3-877e-83815a45bb5f. Two corrections came out of that query
// that earlier copy on this site got wrong, so do not "simplify" either line:
//
//   • Philadelphia Badminton holds ALL THREE badminton courts at once, not
//     some of them. During its windows badminton availability is zero, not
//     reduced.
//   • Chester County Cricket held CRICKET 1 AND 2 ONLY until 2026-10-18, with
//     lane 3 bookable through every academy hour. That stopped being true on
//     Mon 2026-10-19: Aniket gave CCCA a new weekly schedule on 2026-10-15 and
//     it now holds ALL THREE lanes in its hours (weekdays 6-8pm, weekends
//     10am-12pm), plus lane 1 alone for its free girls' class, Sat 9-10am.
//     The cricket line below says so. The lane-3 reasoning that comments in
//     BookingsCalendar.tsx and orangish-app still cite was right for the
//     contract as it stood; it is no longer the current fact.
//
// ⚠️ THE RECURRENCE IS MATERIALISED, NOT COMPUTED. CCCA's hours were `events`
// rows out to 2026-11-01; from 2026-10-15 they are on-account court bookings,
// one row per lane per session, out to the end of Season 1 (2027-03-31). The
// strings below are the PATTERN, hand-transcribed, so they do not fall off a
// cliff when a series ends. If a licence changes, this file is the thing to
// change — nothing here reads the database at runtime.

/** One standing hold on a sport's courts. */
export type FloorHold = {
  /** Must match a `sport` in COURT_RATES so the two can be joined by name. */
  sport: string
  /**
   * WHO holds WHAT, as a finished noun phrase.
   *
   * ⚠️ One string, not a `holder` + `courts` template. It was those two fields
   * rendered as "{holder} has {courts}" until it was read on a phone, where
   * the squash row came out as "A coached hour has one court" — the template
   * only ever fit the two academies, and squash is not an academy. A sentence
   * per row costs one duplicated word and cannot produce that.
   */
  claim: string
  /** When, club-local, as a weekly pattern. No trailing stop — the view adds it. */
  when: string
  /**
   * The reassuring half, where there is one, in the brighter shade: for
   * cricket it is the more actionable of the two facts, because two thirds
   * taken and wholly taken are very different things to a reader.
   */
  stillOpen?: string
}

export const FLOOR_HOLDS: FloorHold[] = [
  {
    sport: 'Badminton',
    claim: 'Philadelphia Badminton has all three courts',
    // Sunday morning is 7–9am since 2026-10-04, and the licence ramps on 2 Nov and
    // 30 Nov — pbaScheduleOn() in lib/pba-schedule.ts is the per-date timetable.
    // Nothing renders FLOOR_HOLDS any more, but a wrong time should not sit here to
    // be copied.
    when: 'Mon 5:30–7:30pm (to 9:30pm from 2 Nov), Wed 5:30–9:30pm, Tue, Thu & Fri 5:30–9:30pm from 30 Nov, Sat 9–11am and 4–6pm, Sun 7–9am and 4–6pm',
  },
  {
    sport: 'Cricket',
    claim: 'Chester County Cricket has all three lanes',
    // From Mon 2026-10-19 (the schedule Aniket set on 2026-10-15). There is no
    // stillOpen half any more: no lane stays free during these hours. The Sat 9-10am
    // hour is lane 1 only, CCCA's free girls' class.
    when: 'weekdays 6–8pm, Sat & Sun 10am–12pm, plus lane 1 Sat 9–10am',
  },
  {
    sport: 'Squash',
    claim: 'One coached hour, on one court',
    when: 'Tue & Thu 7–8pm',
    stillOpen: 'Open otherwise, all week.',
  },
]

/**
 * The line above the holds.
 *
 * Deliberately says "committed", not "booked" or "busy". These hours are not
 * demand — they are contracts — and the heading is the only place a reader is
 * told which of the two they are looking at.
 */
export const FLOOR_HEADING = 'Hours already committed'

/**
 * Carries no number and no date on purpose, so neither a price change nor a
 * schedule slip can falsify it. Same reasoning as CLASS_FEES_NOTE in rates.ts,
 * which survived the 2026-09-30 fee rewrite untouched for exactly this reason.
 */
export const FLOOR_FOOTNOTE = 'Everything else is open to book, round the clock.'
