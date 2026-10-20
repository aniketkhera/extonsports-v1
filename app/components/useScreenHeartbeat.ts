"use client";

import { useEffect } from "react";
import { PLATFORM, readKey } from "./screen-key";
import { noteKeyed, screenRuntime } from "./screen-runtime";
import { buildBeat, type ScreenPage } from "./screen-pure";

/* "I am alive, I am drawing, and this is what I am" — once a minute (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────────
   From Sat 2026-10-17 22:06 EDT the reception TV showed one frozen picture for three
   days. Its page was still running behind the glass — still polling the court feed —
   so every signal anyone had said it was fine. This hook is the signal that would not
   have: it reports, to app.orangish.io/api/public/screen-heartbeat with the screen's
   own board key,
     - frames_age_ms: how long since an animation frame last ran, so a page whose
       timers tick while nothing is painted reads as stalled;
     - launch_tag: tv-keeper's ?k= this document was launched with, so the platform
       and tv-keeper can see a relaunch that never took (the old page keeps an older
       tag — exactly the 2026-10-17 failure);
     - version / latest_version: the deployment it runs and the newest it has seen;
     - reload_requested_ms_ago: set once useReloadOnDeploy has asked to reload.
   tv-keeper reads that back and power-cycles a wedged TV; the platform emails.

   ⛔ ONLY A KEYED SCREEN BEATS. No key — a passer-by's phone on extonsports.com/reception,
   a laptop — means no request at all. The key goes ONLY as a Bearer header to
   PLATFORM, never in a URL; the response is ignored; nothing here sets state or can
   throw into the page. A heartbeat must never be the thing that breaks a screen.

   No keepalive and no sendBeacon: sendBeacon cannot carry an Authorization header,
   and a beat lost at unload is worth nothing anyway — the next document beats. */

/** The rAF probe's period. One outstanding request at a time — 1 Hz, not a 60 Hz loop. */
const PROBE_EVERY_MS = 1_000;
/** First beat this long after mount, so a fresh launch is visible within seconds. */
const BEAT_FIRST_MS = 5_000;
const BEAT_EVERY_MS = 60_000;
const BEAT_TIMEOUT_MS = 10_000;

export default function useScreenHeartbeat(page: ScreenPage) {
  useEffect(() => {
    const key = readKey(); // memoised — the page's own feed effect may have read it first
    if (!key) return;
    noteKeyed();
    const rt = screenRuntime();
    let lastFrame: number | null = null;
    let framesInWindow = 0;
    let pending = false;
    let seq = 0;

    /* A 1 Hz probe rather than a continuous loop: one requestAnimationFrame
       outstanding at a time. A page whose timers run while rAF does not (measured
       2026-10-20 in a hidden pane: setInterval fired 6 times in 3 s, rAF none, while
       visibilityState still said "visible") reports a frames_age_ms that grows. */
    const probe = setInterval(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        lastFrame = performance.now();
        framesInWindow++;
      });
    }, PROBE_EVERY_MS);

    const beat = async () => {
      try {
        const body = buildBeat({
          instance: rt.instance, page, seq: ++seq, launchTag: rt.launchTag,
          version: rt.loadedVersion, latestVersion: rt.latestVersion, nowPerf: performance.now(),
          loadedAtMs: rt.loadedAtMs, lastFramePerf: lastFrame, framesInWindow,
          visibility: typeof document.visibilityState === "string" ? document.visibilityState : null,
          reloadRequestedPerf: rt.reloadRequestedPerf,
        });
        framesInWindow = 0;
        await fetch(`${PLATFORM}/api/public/screen-heartbeat`, {
          method: "POST", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
          signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(BEAT_TIMEOUT_MS)
            : undefined,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        /* a heartbeat never breaks the screen; a missed one is what the platform watches for */
      }
    };

    const first = setTimeout(beat, BEAT_FIRST_MS);
    const every = setInterval(beat, BEAT_EVERY_MS);
    return () => {
      clearInterval(probe);
      clearTimeout(first);
      clearInterval(every);
    };
  }, [page]);
}
