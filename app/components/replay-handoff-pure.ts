/* WHEN THE BADMINTON AND CRICKET TVs HAND OVER TO THE N95's REPLAY SCREEN (2026-11-04).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "when we have PBA and CCCA junior academies going on, and only then (for now)",
   the sport's TV shows its three court cameras live with a QR code to a replay remote. The
   video never leaves the building, so that screen is served by the club's N95 on the LAN
   (orangish-cameras court-replay), not by this site.

   THE N95 DECIDES, NOT THIS SITE. It reads the public court feed (a PBA / CCCA junior-coaching
   block on the sport's courts, now) and reports to the platform at least every 30 s while its
   screen is up and its grid is running. This site only asks the platform whether that report
   is fresh (app.orangish.io/api/public/replay-status). So a box that is down, or a grid that
   is not running, never gets a TV sent to it — a TV sent to a dead address would sit on a
   browser error page for the whole session — and there is one copy of the rule, not two that
   can disagree at a session's edge.

   Pure, and run directly by node --test (replay-handoff.test.mjs). */

export type ReplaySport = "badminton" | "cricket";

/** The N95's court-replay screen, on the club LAN. Only a paired TV is ever sent here. */
export const REPLAY_BOX = "http://10.1.10.124:8090";

/** Exton Sports in the platform's locations table. */
export const EXTON_LOCATION = "f9d70a9d-ca32-4dc3-877e-83815a45bb5f";

/** After the N95 sends a TV back (?replay=back), do not send it again for this long: if the
    box sent it back because its grid failed, it must not be pulled straight back to it. */
export const BACK_HOLD_MS = 3 * 60_000;

export function statusUrl(platform: string, sport: ReplaySport): string {
  return `${platform}/api/public/replay-status?location=${EXTON_LOCATION}&sport=${sport}`;
}

/** Only an explicit `{ on: true }` is a yes. */
export function isOn(body: unknown): boolean {
  return !!body && typeof body === "object" && (body as { on?: unknown }).on === true;
}

/** Where to send the TV: the box's page for the sport, carrying the launch tag (?k=, so
    tv-keeper can still see which launch is on the glass) and the board key (#k=, so the box
    page can keep sending this TV's heartbeat). Never called without a key: no key means this
    is not a paired TV, and the replay screen is for the TVs only (owner, 2026-11-04). */
export function handoffUrl(sport: ReplaySport, key: string, launchTag: string | null): string {
  return `${REPLAY_BOX}/tv/${sport}${launchTag ? `?k=${launchTag}` : ""}#k=${key}`;
}
