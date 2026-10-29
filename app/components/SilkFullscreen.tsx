"use client";

import { useEffect } from "react";

/* FULL SCREEN ON THE FIRE TV, ON ONE PRESS OF OK (2026-10-29).
   ──────────────────────────────────────────────────────────────────────────
   The cricket set is an Insignia Fire TV, and the only browser on it is Amazon Silk.
   Silk keeps its toolbar (address bar, back, reload, menu...) over the top 120px of
   a page that does not scroll, and has no setting to hide it: on 2026-10-29 it
   covered the header's date and clock and pushed the booking band off the bottom.

   Silk does honour the page's own Fullscreen API, but only inside a user gesture. So
   the first OK press (a click on the cursor, or Enter / Select with focus on the
   page) asks for full screen, and the toolbar goes. The N95 at the club sends that
   press over ADB after it opens the page; anybody with the remote can do the same.
   A reload (hourly, or useReloadOnDeploy after a deploy) leaves full screen, so it
   takes another press.

   SILK ONLY. The VIZIOs run these pages in SmartCast, and a laptop or phone may open
   one too: a click there should stay a click. Silk's user agent says "Silk/"; no
   other browser's does. Draws nothing. */
export default function SilkFullscreen() {
  useEffect(() => {
    if (!/\bSilk\//.test(navigator.userAgent)) return;
    const ask = () => {
      if (document.fullscreenElement || !document.fullscreenEnabled) return;
      document.documentElement.requestFullscreen().catch(() => {});
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Select") ask();
    };
    document.addEventListener("click", ask);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", ask);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
