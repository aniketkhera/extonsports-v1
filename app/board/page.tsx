import type { Metadata } from 'next'
import CourtBoard from './CourtBoard'
import './board.css'

/* The court board — what the reception and vestibule televisions show.
   ───────────────────────────────────────────────────────────────────────────────
   One row per court, what is on it now and what is on it next. Replaces
   /comingsoon on those two screens from 2026-10-05, the day the club opened;
   the outside TV keeps /comingsoon, because it faces the street and is selling
   to people who have not come in yet, while these two are read by people
   already standing in the building.

   HOW IT GETS THERE: tv-keeper on the N95 holds a URL per TV in
   tv-keeper/state/tvs.json (orangish-cameras repo) and keeps each VIZIO on it
   over the SmartCast API. Changing a screen means editing that file, not this
   one — nothing in this repo knows which TV shows what.

   ⛔ NO NAMES ON IT, EVER. Same rule as /calendar and the door screen, and the
   reasoning is in CourtBoard.tsx. A lobby television has the widest audience of
   any surface we own.

   Not indexed: it is furniture, not a page, and a search result pointing a
   member at a board with no navigation on it is a dead end. */

export const metadata: Metadata = {
  title: 'Court board',
  robots: { index: false, follow: false },
}

/* The board renders client-side off /api/court-slots, which is itself a cached
   proxy — so this shell is static and the data is always at most a minute old,
   however long the TV has been on. */
export default function BoardPage() {
  return <CourtBoard />
}
