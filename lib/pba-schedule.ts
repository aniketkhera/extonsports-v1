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

   Hand-verified against the platform on 2026-10-05, after the Sunday move below,
   and again on 2026-10-14 (every weekday, Saturday and Sunday shape through
   December matches a phase below).

   ⚠️ SUNDAY MORNING IS 7–9am, NOT 9–11am. Moved by email agreement between Aniket
   and Syam Anand under §3.6 on 2026-10-04 — which lets the days and times vary by
   email without amending the agreement, so long as the weekly total and the
   First/Second Block split are unchanged. SATURDAY WAS NOT MOVED. The contract
   still writes "Sat & Sun 9–11am" as a pair; that pairing is now wrong for Sunday
   and right for Saturday. Do not "fix" the asymmetry.

   §3.9(a) blacks out 25 Dec – 1 Jan every year. Not shown: a visitor reading this
   in October does not need it, and a stale holiday notice is worse than none.

   Only Committed Hours are published. The extra hours PBA takes on BADMINTON 1
   (Fridays 5–6pm to 20 Nov, Saturdays 6–7pm to 19 Dec) are not on this table. */

import { clubDate } from './opening'

export type PbaSlot = {
  day: string
  /** §3.8 First Block — instructed sessions with a coach present. */
  coaching: string | null
  /** §3.8 Second Block — unstructured play PBA monitors, no coach. */
  openPlay: string | null
}

/* ── 7:30–9:30pm ON A WEEKDAY IS OPEN PLAY, AND THE TABLE PICKS ITSELF ───────────
   2026-10-14, Aniket: a weekday evening is coaching 5:30–7:30 and OPEN PLAY
   7:30–9:30 — on Wednesdays now, on Mondays from 2 November (when Monday's hours
   run to 9:30), and on every weekday from 30 November. This file used to publish
   "From 30 November, coaching runs Monday to Friday, 5:30–9:30pm", which said the
   opposite. The licence's own pricing agrees with him: from 30 Nov its First and
   Second Blocks are 42 court-hours a week each — weekday 5:30–7:30 plus the weekend
   mornings, and weekday 7:30–9:30 plus the weekend afternoons.

   The licence ramps in three steps (42 court-hours a week in October, 48 in
   November, 84 from 30 Nov) and since that answer TWO of them change what a visitor
   sees: November gives Monday an open-play hour it did not have. So the table is
   chosen by the club-local date, the way rosterIntro picks its sentence on the
   academies row, and nothing needs editing on 2 or 30 November. The note names the
   changes still to come and disappears after the last. The home page is
   prerendered, so app/page.tsx revalidates it hourly — without that the HTML
   would only change phase on the next deploy.

   ⚠️ WEEKENDS: THE MORNING IS OPEN PLAY, THE 4–6pm BLOCK IS COACHING. 2026-10-18,
   Aniket, during the Sunday 7am session: "This is Open Play. The junior coaching
   for today (and weekends in general) is the evening booking - 4pm-6pm." This file
   had them the other way round, following the licence, whose §1.7 still names the
   weekend mornings as the First (coaching) Block. The weekly totals do not move —
   both weekend blocks are 2 hours on 3 courts on 2 days — so neither does the
   invoice; only the labels do.

   The TVs label the same hours from the platform's lib/court-partners.ts
   (partnerSessionAt) — the same split. Keep the two in step. */
const weekdayEvening = (day: string): PbaSlot => ({ day, coaching: '5:30–7:30pm', openPlay: '7:30–9:30pm' })
const SAT: PbaSlot = { day: 'Sat', coaching: '4–6pm', openPlay: '9–11am' }
const SUN: PbaSlot = { day: 'Sun', coaching: '4–6pm', openPlay: '7–9am' }
const DECEMBER = 'From 30 November it runs Monday to Friday: coaching 5:30–7:30pm, open play 7:30–9:30pm.'

const PBA_PHASES: ReadonlyArray<{ from: string; slots: PbaSlot[]; note: string | null }> = [
  {
    from: '2026-10-05',
    slots: [{ day: 'Mon', coaching: '5:30–7:30pm', openPlay: null }, weekdayEvening('Wed'), SAT, SUN],
    note: `From 2 November, Monday adds open play, 7:30–9:30pm. ${DECEMBER}`,
  },
  {
    from: '2026-11-02',
    slots: [weekdayEvening('Mon'), weekdayEvening('Wed'), SAT, SUN],
    note: DECEMBER,
  },
  {
    from: '2026-11-30',
    slots: [...['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(weekdayEvening), SAT, SUN],
    note: null,
  },
]

/** The timetable in force on `now` (club-local date, never the visitor's own zone),
 *  and the note about what changes next. */
export function pbaScheduleOn(now: Date = new Date()): { slots: PbaSlot[]; note: string | null } {
  const today = clubDate(now)
  let phase = PBA_PHASES[0]
  for (const p of PBA_PHASES) if (p.from <= today) phase = p
  return { slots: phase.slots, note: phase.note }
}

/** All three courts, every session — §1.8. */
export const PBA_COURTS = 'All three badminton courts'
