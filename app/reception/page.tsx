import TvScreen from '../components/TvScreen'
import { tvMetadata, tvViewport } from '../components/tv-screens'

/* The reception desk screen — the 55" at 10.1.10.72.
   ──────────────────────────────────────────────────────────────────────────
   Added 2026-10-07. A second layout over the same feed /board uses: grouped by
   sport, multi-court bookings merged to one line, partner logos against the
   hours they hold.

   ⚠️ WHICH TV LOADS THIS ADDRESS is not decided here: tv-keeper on the N95 holds
   one url per set in tv-keeper/state/tvs.json (orangish-cameras repo; gitignored
   and root-owned on the box), set once per TV, and relaunches it hourly. WHAT
   THIS ADDRESS SHOWS is not decided here either, but in
   app/components/tv-screens.ts (below).

   ⛔ NAMES: keyed yes, unkeyed initials only — exactly as /board. With the
   board_screens token this names organisations and members in full, which is
   the point of a screen behind the desk. Without one it falls back to the
   public proxy and shows initials. The rules about what may appear in a
   holder string are enforced server side in the platform's
   lib/court-holders.ts, never here.

   WHAT THIS ADDRESS SHOWS is decided in app/components/tv-screens.ts, from
   2026-10-20, when each TV got an address of its own. /reception is the reception
   TV's. The vestibule set moves to /vestibule once tv-keeper is re-pointed (until
   then it loads this address, with its own key). This page renders the
   reception TV's entry there, which today is the court board (ReceptionBoard.tsx,
   which /vestibule draws too). It is also the board's PUBLIC address. Until
   2026-10-18 the screen itself said "view this screen at extonsports.com/reception",
   so giving the reception TV a promo changes what that address shows phones as well.

   Not indexed and not in sitemap.ts: it is furniture, not a page. */

export const metadata = tvMetadata('reception')
export const viewport = tvViewport('reception')

export default function ReceptionPage() {
  return <TvScreen id="reception" />
}
