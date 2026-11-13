import { NextResponse } from 'next/server'
import { onAir } from '../../../../lib/live/youtube'
import { NO_SPORTS, liveSports, sportsOnAir, type LiveSports } from '../../../../lib/live/sports'

/* GET /api/live/status — "is a coaching session on air right now?"
   ──────────────────────────────────────────────────────────────────────────────
   2026-11-12. The one thing the LIVE NOW badge asks. It exists because the homepage is
   prerendered hourly (app/page.tsx: `export const revalidate = 3600`), so a badge
   rendered on the server would tell a visitor at 19:00 what was true at 18:00. The badge
   is a client component that polls this instead.

   ⛔ IT RETURNS { live } AND NOTHING ELSE — never the videoId.
   onAir() has the id, and it is tempting to pass it through so the badge could link
   straight to the picture. That would hand the broadcast to anyone who typed this
   address, and the whole point of /live is that the way in is a link emailed for one
   day. The id stays on the watch page behind the token. A boolean is the entire
   public contract.

   FAIL CLOSED. onAir() has three states and only 'on_air' lights the badge. 'unknown' —
   Google unreachable, credentials unset, token expired — reports false, because a badge
   that says a camera is on children had better be right. The watch page treats 'unknown'
   differently and says so in words (live-pure.ts LIVE_COPY.unknown); here there is no
   room to explain, so silence is the honest answer.

   QUOTA. onAir() caches for thirty seconds in the lambda, and `revalidate` below caches
   the response at the edge for the same thirty, so a full hall of refreshing parents
   costs about two units a minute against a 10,000-unit daily quota. */

export const revalidate = 30

export type LiveStatusPayload = { live: boolean; sports: LiveSports }

export async function GET() {
  const a = await onAir()
  const live = a.state === 'on_air'
  /* The sides are asked for only when something is actually on air, so the club's screens
     never spend a call on the platform outside session hours — and `sportsOnAir` would
     have thrown the answer away anyway. */
  const sports = sportsOnAir(live, live ? await liveSports() : NO_SPORTS)
  return NextResponse.json({ live, sports } satisfies LiveStatusPayload)
}
