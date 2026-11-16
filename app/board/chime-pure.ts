/* THE TIME-UP CHIME — the rules, with no browser in them (2026-11-15).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-15: "build the chime at time-up". The OFF COURT countdown (2026-10-25,
   board-lib courtNudges / nudgeFace) turns a booking's time into TIME UP at its end when
   another party is waiting for the court; from today a TV can also ring a chime at that
   moment. He reversed his 10-25 "no spoken announcement" for the extend offer on 11-02;
   this is a chime, not words, and only where the board already says TIME UP.

   WHEN: the first seconds of TIME UP, once per end instant per page. Not for ENDS IN
   (nobody is waiting), not for a holder who carries on (`continues` gives no nudge), never
   twice for one end however many courts or sports end then, and never again after a
   reload inside the window (chimeKey, kept in sessionStorage by the component).

   WHERE: per TV, in tv-screens.ts (`chime`: the sports whose TIME UP rings on that set).
   Absent means silent, which every set was when this shipped: the sound check with him
   on site came first (2026-11-15, 3 PM). What each set's browser allows is a fact about
   the set, not the code: the badminton VIZIO played page audio with no gesture on
   2026-11-10; the cricket Fire TV's Silk refused it (orangish-app docs/court-extend.md
   §11.2b) — app/components/TimeUpChime.tsx unlocks it on the OK press the N95 already
   sends. The component reports each play as PLAYED or BLOCKED in the test overlay.

   The sound is synthesised (Web Audio), not a file: nothing to fetch, cache or license,
   and the level is one number here. */

/** How long after the end a chime may still start. A screen that was asleep, reloading
 *  or on its 15 s grouping tick at the end still rings if it wakes inside this; one that
 *  wakes later does not ring a stale TIME UP. */
export const CHIME_WINDOW_MS = 20_000;

/** The level a live chime plays at, as a Web Audio gain where 1 is full scale (the TV's
 *  own volume sets the rest). PROVISIONAL until the 2026-11-15 sound check, which plays
 *  CHIME_TEST_LEVELS and picks one. */
export const CHIME_GAIN = 0.45;

/** The longest a test URL may stay live: ?chimetest=<until> beyond this is refused. */
export const CHIME_TEST_MAX_AHEAD_MS = 3 * 60 * 60_000;

/** The test's deadline from ?chimetest=<until> (epoch ms, or an ISO time), or null when the
 *  page must not test: no parameter, unreadable, already past, or more than
 *  CHIME_TEST_MAX_AHEAD_MS ahead (review, 2026-11-15). An ABSOLUTE time, not one counted
 *  from page load, because a set left on the test URL is relaunched hourly by tv-keeper
 *  and on every deploy: counted from load, it would ring again after each. */
export function testUntil(param: string | null, nowMs: number): number | null {
  if (param == null || param === "") return null;
  const n = /^\d{12,14}$/.test(param) ? Number(param) : Date.parse(param);
  if (!Number.isFinite(n) || n <= nowMs || n - nowMs > CHIME_TEST_MAX_AHEAD_MS) return null;
  return n;
}

/** The three levels the test mode cycles through (?chimetest=<until>), quiet to loud. */
export const CHIME_TEST_LEVELS = [0.2, 0.45, 0.9] as const;
/** The test rings once every this many ms ... */
export const CHIME_TEST_EVERY_MS = 12_000;
/** ... for this long, then stops by itself (a set left on the test URL goes quiet). */
export const CHIME_TEST_FOR_MS = 6 * 60_000;

export type ChimeStrike = { at: number; hz: number };

/** The chime: a doorbell's "ding-dong" (E5 then C5), rung twice. Seconds from the start.
 *  The cricket lanes' sound, heard and approved at level 2 on 2026-11-16. */
export const CHIME_STRIKES: ReadonlyArray<ChimeStrike> = [
  { at: 0, hz: 659.25 },
  { at: 0.55, hz: 523.25 },
  { at: 1.6, hz: 659.25 },
  { at: 2.15, hz: 523.25 },
];

/* A SOUND PER SPORT (2026-11-16, Aniket at the sound check: "Maybe have a different chime
   for badminton"). The badminton TV and the cricket TV hang in one hall, so each sport's
   TIME UP has its own pattern and nobody on a lane wonders whether it was theirs. Same
   bell tone, same level, different notes and rhythm. */
export const CHIME_SOUNDS: Readonly<Record<string, ReadonlyArray<ChimeStrike>>> = {
  Cricket: CHIME_STRIKES,
  /* Three notes rising, C5 E5 G5, twice: brighter and quicker than cricket's ding-dong. */
  Badminton: [
    { at: 0, hz: 523.25 }, { at: 0.28, hz: 659.25 }, { at: 0.56, hz: 783.99 },
    { at: 1.6, hz: 523.25 }, { at: 1.88, hz: 659.25 }, { at: 2.16, hz: 783.99 },
  ],
  /* Squash (reception): three quick high dings on A5, twice. */
  Squash: [
    { at: 0, hz: 880 }, { at: 0.22, hz: 880 }, { at: 0.44, hz: 880 },
    { at: 1.5, hz: 880 }, { at: 1.72, hz: 880 }, { at: 1.94, hz: 880 },
  ],
};

/** The strikes for a sport; anything unknown rings the ding-dong. */
export function chimeStrikes(sport: string | null | undefined): ReadonlyArray<ChimeStrike> {
  return (sport && Object.prototype.hasOwnProperty.call(CHIME_SOUNDS, sport) && CHIME_SOUNDS[sport]) || CHIME_STRIKES;
}

/* HOW A SET PLAYS IT (2026-11-16 sound check). The badminton and reception VIZIOs reported
   Web Audio as playing and made no sound at volume 100; the same chime as an <audio> clip
   was heard on both. The cricket Fire TV (Silk) played Web Audio once unlocked. So: Silk
   gets the tone, everything else the clip. By user agent, as SilkFullscreen.tsx does. */
export function chimeVia(userAgent: string): "tone" | "clip" {
  return /\bSilk\//.test(userAgent) ? "tone" : "clip";
}
/** A bell-ish tone: the fundamental and three quieter overtones (multiple, amplitude). */
export const CHIME_PARTIALS: ReadonlyArray<readonly [number, number]> = [[1, 1], [2, 0.32], [3, 0.11], [4.16, 0.05]];
/** One strike's ring-out, in seconds (overtones die faster: this / sqrt(multiple)). */
export const CHIME_DECAY_S = 1.9;
/** The sum of the partials' amplitudes: the master gain divides by it, so a strike's
 *  peak is the requested level and the loudest test level cannot clip. */
export const CHIME_PEAK = CHIME_PARTIALS.reduce((s, [, a]) => s + a, 0);

/** Does the chime ring now? `face` is nudgeFace's kind this second; `msPastEnd` is now
 *  minus the end instant. Only TIME UP, and only in its first CHIME_WINDOW_MS. */
export function chimeDue(face: string, msPastEnd: number): boolean {
  return face === "timeUp" && msPastEnd >= 0 && msPastEnd < CHIME_WINDOW_MS;
}

/** One chime per end INSTANT on a page — however many courts, entries or sports end then. */
export function chimeKey(endMs: number): string {
  return `chime:${Math.round(endMs)}`;
}

/** Whether a set rings for a sport: its `chime` list names it. Exact, case-sensitive
 *  sport names as the feed gives them ("Badminton", "Cricket", "Squash"). */
export function chimesFor(sports: readonly string[] | undefined, sport: string): boolean {
  return Array.isArray(sports) && sports.includes(sport);
}

/** The test mode's level for its n-th ring (0-based): cycles 1, 2, 3, 1, ... unless
 *  `pinned` (1..3, from ?chimelevel=) holds one. Returns the 1-based level and its gain. */
export function testLevel(n: number, pinned?: number | null): { level: number; gain: number } {
  const count = CHIME_TEST_LEVELS.length;
  const level = pinned && pinned >= 1 && pinned <= count ? Math.floor(pinned) : (Math.max(0, Math.floor(n)) % count) + 1;
  return { level, gain: CHIME_TEST_LEVELS[level - 1] };
}
