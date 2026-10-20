"use client";

import { useEffect } from "react";
import { noteReloadRequested, noteVersionSeen, screenRuntime } from "./screen-runtime";
import { shouldSeedFromLoaded } from "./screen-pure";

/* "Whatever is on the URL is what the TV shows."
   ───────────────────────────────────────────────────────────────────────────
   A wall screen loads its page and holds it — tv-keeper (orangish-cameras)
   relaunches it HOURLY since 2026-10-20 (every ten minutes before that), and on
   a power-on. An hour is still too long for a deploy to take to reach the wall,
   and nobody would know which version a given screen was on.

   So every screen polls /api/screen-version and reloads itself when the
   deployment id changes. A failed poll (the club's internet blipping) is
   skipped; the next one tries again. Locally the version is the constant
   'local', so `next dev` pages never reload themselves.

   Since 2026-10-20 a reload is not taken on trust either: the page notes that it
   asked (noteReloadRequested), and its heartbeat reports how long ago. A normal
   reload ends this document within a second; one still beating minutes later is
   a wedged TV browser — the 2026-10-17 freeze queued this very reload behind a
   hung launch for three days.

   THE BASELINE IS WHAT THE PAGE LOADED, NOT THE FIRST POLL (2026-10-20). It used
   to be the first poll's answer. A first poll that failed (internet blip at boot)
   followed by a deploy then adopted the NEW id as the baseline, and the page ran
   the old build until something else relaunched it. Now the baseline is the
   deployment the running scripts came from (screen-runtime, ?dpl=), when it and
   the poll are both Vercel deployment ids; otherwise the first poll, as before.

   Written for /comingsoon on 2026-09-19 and lifted out of it on 2026-10-05
   when /board became the second screen. Any third one gets it for free — which
   is the point, because a screen that silently serves a stale deploy is the
   failure nobody discovers for a fortnight. */

/** sessionStorage: the version this tab last reloaded FOR — the loop guard below. */
const RELOADED_FOR = "screen-reloaded-for";

function canStore(): boolean {
  try {
    sessionStorage.setItem(RELOADED_FOR + "-probe", "1");
    sessionStorage.removeItem(RELOADED_FOR + "-probe");
    return true;
  } catch {
    return false;
  }
}

export default function useReloadOnDeploy(everyMs = 60_000) {
  useEffect(() => {
    const rt = screenRuntime();
    let first: string | null = null;
    const check = async () => {
      try {
        const res = await fetch("/api/screen-version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!version) return;
        noteVersionSeen(version);
        if (first === null) {
          /* Only when the loop guard below can work: without sessionStorage a
             persistent mismatch (a stale cached shell) would reload every minute,
             so a tab that cannot store keeps the old first-poll baseline. */
          const loaded = rt.loadedVersion;
          first = loaded !== null && !rt.versionFromPoll && shouldSeedFromLoaded(loaded, version) && canStore()
            ? loaded
            : version;
        }
        if (version === first) return;
        /* THE LOOP GUARD. If this tab already reloaded once for exactly this
           version and is still not on it (a cached HTML shell, a seed that was
           wrong), reloading again would do the same thing every minute for ever.
           Stop comparing against the old baseline instead; the next real deploy
           still reloads. sessionStorage survives the reload and is per tab. */
        let done: string | null = null;
        try { done = sessionStorage.getItem(RELOADED_FOR); } catch { /* storage blocked */ }
        if (done === version) { first = version; return; }
        try { sessionStorage.setItem(RELOADED_FOR, version); } catch { /* storage blocked */ }
        noteReloadRequested();
        window.location.reload();
      } catch {
        /* offline — try again next tick */
      }
    };
    const kick = setTimeout(check, 0);
    const id = setInterval(check, everyMs);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
    };
  }, [everyMs]);
}
