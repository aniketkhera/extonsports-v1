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
   than a rally (3.75 s on average, 15 s at worst). Equal halves, because he asked for the
   two to rotate, not for a music interlude.

   THE GAP. At each swap the new line appears at once but its code only BAND_GAP_MS later.
   Without it the two codes, on the same pixels, replace each other in one frame, and a
   phone camera already locked on the booking code simply re-reads the music one: its chip
   changes to extonsports.com — the very domain the booking line prints — and whoever taps
   it lands on the speaker remote, not the booking page (review, 2026-11-13: a 2–3 s
   lift-to-tap crosses a swap in ~15–20% of scans). With no code for 1.5 s the camera loses
   its lock and the chip clears, so the next code is a fresh read under its own words.

   Why the wall clock and not a timer: the view is a pure function of the shared second
   tick (ScreenChrome's secondTicker), so nothing schedules, nothing drifts, a re-render
   cannot restart the cycle, every TV flips together, and a test can name the exact
   millisecond a face changes.

   While the extend panel is up the band shows NO code at all (ExtendPanel.tsx: never three
   codes on the wall): the face is "book" — the booking line without its code — and the
   cycle simply resumes on the wall clock when the panel goes. Before the first tick (the
   server render, the frame before hydration) it is the booking face with its code, so the
   first paint looks as the band always did. */

/** How long each face stays up. */
export const BAND_ROTATE_MS = 15_000;
/** How long, at the start of each face, its code waits behind its words. */
export const BAND_GAP_MS = 1_500;

export type BandFace = "book" | "music";

/** The face at `ms` (epoch milliseconds, the second tick's value; 0 before the first
 *  tick), given whether the extend panel is up. Even 15-second slots are the booking
 *  code's, odd ones the music code's. */
export function bandFace(ms: number, up: boolean): BandFace {
  if (up || !Number.isFinite(ms) || ms <= 0) return "book";
  return Math.floor(ms / BAND_ROTATE_MS) % 2 === 1 ? "music" : "book";
}

/** Whether the face's code is drawn at `ms`: not with the panel up, not in the first
 *  BAND_GAP_MS of a face; yes before the first tick (the band's first paint). */
export function bandCode(ms: number, up: boolean): boolean {
  if (up) return false;
  if (!Number.isFinite(ms) || ms <= 0) return true;
  return ms % BAND_ROTATE_MS >= BAND_GAP_MS;
}
