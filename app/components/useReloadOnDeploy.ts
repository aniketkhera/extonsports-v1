"use client";

import { useEffect } from "react";

/* "Whatever is on the URL is what the TV shows."
   ───────────────────────────────────────────────────────────────────────────
   A wall screen loads its page once and holds it for days — it reloads only
   when the TV power-cycles and tv-keeper (orangish-cameras) launches it again.
   Without this, a deploy would reach a wall at the next power cut and nobody
   would know which version a given screen was on.

   So every screen polls /api/screen-version and reloads itself when the
   deployment id changes. A failed poll (the club's internet blipping) is
   skipped; the next one tries again. Locally the version is the constant
   'local', so `next dev` pages never reload themselves.

   Written for /comingsoon on 2026-09-19 and lifted out of it on 2026-10-05
   when /board became the second screen. Any third one gets it for free — which
   is the point, because a screen that silently serves a stale deploy is the
   failure nobody discovers for a fortnight. */
export default function useReloadOnDeploy(everyMs = 60_000) {
  useEffect(() => {
    let first: string | null = null;
    const check = async () => {
      try {
        const res = await fetch("/api/screen-version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!version) return;
        if (first === null) first = version;
        else if (version !== first) window.location.reload();
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
