/* The Junior Squad timetable — the club's own coached squash squads, delivered
   by SquashTigers, on the academies row.
   ───────────────────────────────────────────────────────────────────────────────
   WHY THIS EXISTS NOW, WHEN THE CARD DELIBERATELY HAD NO TIMETABLE BEFORE.

   The SquashTigers row used to carry only "Enrolling now", with a comment in
   Hero.tsx explaining that squashtigers.com's published pattern is a GROUP-WIDE
   statement across NJ/PA/CT, qualified with "when school is in session" — so
   printing it as an Exton schedule would have been wrong.

   That reasoning was right and is now spent. As of 2026-10-05 the platform holds
   a real, Exton-specific programme: `Junior Squad` (squad_programs
   7a5053e1-c8cf-4b96-931a-3eb78a4f7db5), 55 dated sessions on three squash
   courts, each one blocking the floor in court_occupancy. This is that
   programme, not a national pattern.

   Hand-verified against the platform 2026-10-05, after the courts were allocated.

   ⚠️ If the term is extended past 22 Dec, or the holiday cancellations change,
   this file does NOT follow automatically — nothing here reads the database at
   runtime. The sessions and this table are two separate statements of the same
   fact, and the sessions are the one that governs. */

export type SquadSlot = { day: string; time: string }

/** The weekly pattern. Five sessions a week, all coached, 60 minutes. */
export const SQUAD_SCHEDULE: SquadSlot[] = [
  { day: 'Mon', time: '5:30–6:30pm' },
  { day: 'Tue', time: '5:30–6:30pm' },
  { day: 'Thu', time: '5:30–6:30pm' },
  { day: 'Sat', time: '10–11am' },
  { day: 'Sun', time: '10–11am' },
]

/* Said on the face of the card because all three change what a parent decides:
   the cap is small enough to sell out, the price is per session rather than a
   term fee, and three courts is why twelve players is not a crowd. */
export const SQUAD_NOTE = 'Max 12 players across three courts · $35 a session.'

/* The breaks are listed rather than implied. A parent who turns up on
   Thanksgiving to a locked door remembers it; one who reads it here does not.
   These four dates are cancelled in the platform, not merely unpublished. */
export const SQUAD_TERM = 'Term runs to 22 December. No sessions on Thanksgiving, Christmas Eve, 26 or 27 December.'
