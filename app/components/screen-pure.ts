/* The pure half of the screen heartbeat (2026-10-20): no React, no window, no clock.
   ──────────────────────────────────────────────────────────────────────────────────
   WHY THERE IS A HEARTBEAT. From Sat 2026-10-17 22:06 EDT the reception TV showed one
   frozen picture for three days. tv-keeper's relaunch hung inside the TV; the OLD page
   kept running behind the frozen glass, so its court-board polling kept the screen's
   token "recently used", and the TV went on REPORTING the URL it had been told to load.
   Nothing alerted; the owner noticed by eye. So each screen now proves, every minute,
   that it is alive AND drawing, which launch it came from, and which deployment it runs
   — to app.orangish.io/api/public/screen-heartbeat, with its own board key.

   Everything here is a plain function of its arguments so it can be tested with
   node:test (screen-pure.test.mjs). The browser-facing glue is screen-runtime.ts and
   useScreenHeartbeat.ts.

   The body built here is a CONTRACT with the platform (orangish-app lib/screen-watch.ts
   parseBeat): a wrong field name or an out-of-range number is a 400, and a 400 is a
   screen the platform thinks is silent. Change a name or a bound on both sides at once. */

/** tv-keeper's launch tag: `?k=<String(Date.now())>` in the SEARCH part — 13 digits.
 *  Not to be confused with the 43-character key in the FRAGMENT (screen-key.ts). */
export const LAUNCH_TAG_RE = /^\d{13}$/;
/** A Vercel deployment id ("dpl_…"), or whatever /api/screen-version falls back to. */
export const VERSION_RE = /^[A-Za-z0-9_.-]{1,64}$/;

/** Postgres integer. frames_age_ms and reload_requested_ms_ago are clamped to it. */
const INT_MAX = 2_147_483_647;
const SEQ_MAX = 10_000_000;
const UPTIME_MAX = 31_536_000_000;
const FRAMES_MAX = 100_000;
const VISIBILITY = new Set(["visible", "hidden", "prerender"]);

/** The launch tag the page was opened with, or null. Reads `k` from a search string
 *  ("?k=1760753163885"); anything that is not exactly 13 digits is null — including a
 *  43-char key, should one ever be put in the wrong half of the URL. */
export function launchTagFrom(search: string): string | null {
  try {
    const k = new URLSearchParams(search).get("k");
    return k !== null && LAUNCH_TAG_RE.test(k) ? k : null;
  } catch {
    return null;
  }
}

/* Which deployment the RUNNING JavaScript came from (2026-10-20).
   Vercel builds append ?dpl=<deployment id> to every /_next script (Next's deploymentId,
   set by Vercel). The <html data-dpl-id> attribute says the same in the server HTML but
   is gone after hydration (measured 2026-10-20), so the script URLs are the reliable
   place. `base` resolves relative srcs. Null when no script
   carries one (`next dev`, or a host that does not set a deployment id); the page then
   falls back to the first /api/screen-version answer (screen-runtime noteVersionSeen). */
export function versionFromScripts(srcs: string[], base: string): string | null {
  for (const src of srcs) {
    if (!src) continue;
    try {
      const v = new URL(src, base).searchParams.get("dpl");
      if (v !== null && VERSION_RE.test(v)) return v;
    } catch {
      /* an unparseable src says nothing; try the next one */
    }
  }
  return null;
}

export type ScreenPage = "reception" | "board" | "comingsoon";

export type BeatInput = {
  instance: string;
  page: ScreenPage;
  seq: number;
  launchTag: string | null;
  version: string | null;
  latestVersion: string | null;
  /** performance.now() at the moment of the beat. */
  nowPerf: number;
  /** Wall-clock ms when the document loaded (TV clock; informational). */
  loadedAtMs: number;
  /** performance.now() of the last animation-frame probe callback, or null before the first. */
  lastFramePerf: number | null;
  framesInWindow: number;
  visibility: string | null;
  /** performance.now() when useReloadOnDeploy asked for a reload, or null. */
  reloadRequestedPerf: number | null;
};

/** An integer in [lo, hi]; a non-finite input is `lo`. */
function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** ms from `then` to `now`, as a non-negative integer, or null when there is no `then`. */
function ageMs(now: number, then: number | null): number | null {
  if (then === null || !Number.isFinite(then) || !Number.isFinite(now)) return null;
  return clampInt(now - then, 0, INT_MAX);
}

function isoOrNull(ms: number): string | null {
  try {
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  } catch {
    return null;
  }
}

const versionOrNull = (v: string | null) => (v !== null && VERSION_RE.test(v) ? v : null);

/** Exactly the heartbeat body the platform accepts (v 1), every number an integer
 *  inside the platform's bounds — a beat the server would reject is a screen it
 *  would wrongly call silent, so the clamps live here as well as there. */
export function buildBeat(i: BeatInput): Record<string, unknown> {
  return {
    v: 1,
    instance: i.instance,
    page: i.page,
    seq: clampInt(i.seq, 1, SEQ_MAX),
    launch_tag: i.launchTag !== null && LAUNCH_TAG_RE.test(i.launchTag) ? i.launchTag : null,
    version: versionOrNull(i.version),
    latest_version: versionOrNull(i.latestVersion),
    uptime_ms: clampInt(i.nowPerf, 0, UPTIME_MAX),
    loaded_at: isoOrNull(i.loadedAtMs),
    frames_age_ms: ageMs(i.nowPerf, i.lastFramePerf),
    frames_in_window: clampInt(i.framesInWindow, 0, FRAMES_MAX),
    visibility: i.visibility !== null && VISIBILITY.has(i.visibility) ? i.visibility : null,
    reload_requested_ms_ago: ageMs(i.nowPerf, i.reloadRequestedPerf),
  };
}

/* The corner stamp's words: the deployment's last six characters and when this page
   loaded, club time — "NMKcNi · OCT 20 11:38". So a person standing at a TV can tell
   which build it is on and whether it reloaded when it should have (2026-10-20). The
   version keeps its case (ids are case-sensitive); the date is uppercased like every
   other date on these screens. In the club's zone, not the TV's: a VIZIO carries
   whatever timezone it shipped with. */
export function stampText(version: string | null, loadedAtMs: number, tz: string): string {
  const v = version ? version.slice(-6) : "------";
  let when = "--- -- --:--";
  try {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz, month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      })
        .formatToParts(new Date(loadedAtMs))
        .map((x) => [x.type, x.value]),
    );
    when = `${p.month} ${p.day} ${p.hour}:${p.minute}`.toUpperCase();
  } catch {
    /* an invalid time or zone: the placeholder says so */
  }
  return `${v} · ${when}`;
}

/* Whether useReloadOnDeploy may take the deployment the page LOADED as its baseline
   (2026-10-20). Only when both speak Vercel's vocabulary: /api/screen-version falls
   back to the commit SHA, and a "dpl_…" compared with a SHA would never match — a page
   that reloads for ever. Otherwise the first poll answer is the baseline, as before. */
export function shouldSeedFromLoaded(loaded: string | null, polled: string): boolean {
  return loaded !== null && loaded.startsWith("dpl_") && polled.startsWith("dpl_");
}
