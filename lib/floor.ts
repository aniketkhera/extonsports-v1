// Who has the floor, and when.
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
//   • Chester County Cricket holds CRICKET 1 AND 2 ONLY — never CRICKET 3.
//     Lane 3 is bookable through every academy hour, which is why the line
//     says so: it is the difference between "cricket is taken" and "cricket is
//     two-thirds taken", and it is the useful half of the sentence.
//
// ⚠️ THE RECURRENCE IS MATERIALISED, NOT COMPUTED. Those events exist in the
// database as individual rows, currently out to 2026-11-01. The strings below
// are the PATTERN, hand-transcribed, so they do not fall off a cliff when the
// series ends. If a licence changes, this file is the thing to change — nothing
// here reads the database at runtime.

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
    when: 'Mon 5:30–7:30pm, Wed 5:30–9:30pm, Sat & Sun 9–11am and 4–6pm',
  },
  {
    sport: 'Cricket',
    claim: 'Chester County Cricket has lanes 1 and 2',
    when: 'weekdays 5–8pm, Sat 10am–12:30pm',
    stillOpen: 'Lane 3 stays open.',
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
