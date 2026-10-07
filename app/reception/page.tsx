import type { Metadata } from 'next'
import ReceptionBoard from './ReceptionBoard'

/* The reception desk screen — the 55" at 10.1.10.72.
   ──────────────────────────────────────────────────────────────────────────
   Added 2026-10-07. A second layout over the same feed /board uses: grouped by
   sport, multi-court bookings merged to one line, partner logos against the
   hours they hold. The vestibule 75" keeps /board.

   ⚠️ WHICH TV SHOWS THIS IS NOT DECIDED HERE. tv-keeper on the N95 holds the
   url per screen in tv-keeper/state/tvs.json (orangish-cameras repo) and
   relaunches it every ten minutes. Changing a screen means editing that file,
   not this one. That file is gitignored and root-owned on the box.

   ⛔ NAMES: keyed yes, unkeyed initials only — exactly as /board. With the
   board_screens token this names organisations and members in full, which is
   the point of a screen behind the desk. Without one it falls back to the
   public proxy and shows initials. The rules about what may appear in a
   holder string are enforced server side in the platform's
   lib/court-holders.ts, never here.

   Not indexed: it is furniture, not a page. */

export const metadata: Metadata = {
  title: 'Reception board',
  robots: { index: false, follow: false },
}

export default function ReceptionPage() {
  return <ReceptionBoard />
}
