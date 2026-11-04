/* WHEN THE BADMINTON AND CRICKET TVs HAND OVER TO THE N95's REPLAY SCREEN (2026-11-04).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "when we have PBA and CCCA junior academies going on, and only then (for now)",
   the sport's TV shows its three court cameras live with a QR code to a replay remote. The
   video never leaves the building, so that screen is served by the club's N95 on the LAN
   (orangish-cameras court-replay), not by this site. This file is only the decision, shared
   with the N95's own copy of it (court_replay.py Feed.session) — keep the two the same:

     a block TODAY (club time) on one of the sport's courts, held by the sport's partner
     (org), whose session is junior-coaching, with now inside [from, to). True edges
     (exactFrom/exactTo) win over the half-hour grid when the feed sends them.

   Open play does not count. A Squash block never counts. Nothing names a person.

   Pure, and run directly by node --test (replay-handoff.test.mjs). */

export type ReplaySport = "badminton" | "cricket";

/** The N95's court-replay screen, on the club LAN. Only a paired TV is ever sent here. */
export const REPLAY_BOX = "http://10.1.10.124:8090";

/** After the N95 sends a TV back (?replay=back), do not send it again for this long: the two
    feeds can disagree for up to a minute at a session's edge, and a TV must not bounce. */
export const BACK_HOLD_MS = 3 * 60_000;

const PARTNER: Record<ReplaySport, { feed: string; org: string }> = {
  badminton: { feed: "Badminton", org: "philadelphia-badminton" },
  cricket: { feed: "Cricket", org: "ccca" },
};

type Feed = {
  courts?: { id: string; sport: string }[];
  blocks?: { date: string; courtId: string; from: number; to: number; org?: string; session?: string; exactFrom?: number; exactTo?: number }[];
};

export function academyOn(feed: Feed | null | undefined, sport: ReplaySport, date: string, minutes: number): boolean {
  if (!feed?.courts || !feed.blocks) return false;
  const p = PARTNER[sport];
  const courts = new Set(feed.courts.filter((c) => c.sport === p.feed).map((c) => c.id));
  return feed.blocks.some((b) => {
    if (b.date !== date || !courts.has(b.courtId) || b.org !== p.org || b.session !== "junior-coaching") return false;
    const from = b.exactFrom ?? b.from, to = b.exactTo ?? b.to;
    return from <= minutes && minutes < to;
  });
}

/** Where to send the TV: the box's page for the sport, carrying the launch tag (?k=, so
    tv-keeper can still see which launch is on the glass) and the board key (#k=, so the box
    page can keep sending this TV's heartbeat). Never called without a key: no key means this
    is not a paired TV, and the replay screen is for the TVs only (owner, 2026-11-04). */
export function handoffUrl(sport: ReplaySport, key: string, launchTag: string | null): string {
  return `${REPLAY_BOX}/tv/${sport}${launchTag ? `?k=${launchTag}` : ""}#k=${key}`;
}
