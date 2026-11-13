/* WHICH CODE THE BADMINTON TV'S BAND SHOWS (2026-11-13).
   ──────────────────────────────────────────────────────
   The band under the board carries one small QR. On the badminton TV two codes want it:
   the booking page's, and the Main Door speaker page's (extonsports.com/music, the owner's
   "point the QR to the open page", PR #194). #194 put the music code in its own tile beside
   the orangish.io pill; on the wall that read as a band with a code at each end — "looking
   very busy", Aniket, the same day: "maybe rotate the two". So they take turns in ONE spot:
   the booking line and its code, then the music line and its code, BAND_ROTATE_MS each.

   Why 15 s each: long enough that a phone lifted when a face appears has it for the whole
   scan (cameras lock in 1–2 s), short enough that whoever wants the other one waits less
   than a rally. Equal halves, because he asked for the two to rotate, not for a music
   interlude.

   Why the wall clock and not a timer: the face is a pure function of the shared
   second tick (ScreenChrome's secondTicker), so nothing schedules, nothing drifts, a
   re-render cannot restart the cycle, and a test can name the exact millisecond a face
   changes.

   While the extend panel is up the band shows NO code at all (ExtendPanel.tsx: never three
   codes on the wall), so the face is "book" — the booking line without its code — and the
   cycle simply resumes on the wall clock when the panel goes. Before the first tick
   (server render, the frame before hydration) it is "book", which is the band's markup
   from before any of this. */

/** How long each face stays up. */
export const BAND_ROTATE_MS = 15_000;

export type BandFace = "book" | "music";

/** The face at `ms` (epoch milliseconds, the second tick's value; 0 before the first
 *  tick), given whether the extend panel is up. Even 15-second slots are the booking
 *  code's, odd ones the music code's. */
export function bandFace(ms: number, up: boolean): BandFace {
  if (up || !Number.isFinite(ms) || ms <= 0) return "book";
  return Math.floor(ms / BAND_ROTATE_MS) % 2 === 1 ? "music" : "book";
}
