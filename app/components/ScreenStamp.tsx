"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "./screen-runtime";
import { stampText } from "./screen-pure";
import { CLUB_TZ } from "../../lib/opening";

/* A tiny version stamp in a screen's corner (2026-10-20) — "NMKcNi · OCT 20 11:38":
   the last six characters of the deployment this page runs, and when it loaded, club
   time. After the 2026-10-17 freeze nobody standing at the TV could tell an old picture
   from a live one; this lets a person check a screen against what was deployed, and a
   load time days old says the TV has not relaunched.

   Only on a PAIRED screen (a board key was read) or with ?diag in the URL — never on a
   passer-by's phone at extonsports.com/reception. Quiet by design: the call site picks
   the place and a literal colour (these screens never use --color-* tokens).

   An external store (screen-runtime), as ticker.ts does it: the server snapshot is null,
   so the server and the first client render both draw nothing — no hydration mismatch,
   and no state set from an effect. */
export default function ScreenStamp({ className, style }: { className?: string; style?: CSSProperties }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!snap || !(snap.keyed || snap.diag)) return null;
  return (
    <div className={className} style={style} aria-hidden>
      {stampText(snap.version, snap.loadedAtMs, CLUB_TZ)}
    </div>
  );
}
