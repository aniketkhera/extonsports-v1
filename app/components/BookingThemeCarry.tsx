"use client";

import { useEffect } from "react";
import { BOOK_COURT_URL } from "../../lib/booking";

/* Carries the theme the visitor is looking at onto the booking page, 2026-10-13 —
   Aniket: "make sure that the light/dark mode is also retained".

   The booking page lives on app.orangish.io, which cannot read this site's
   localStorage ("exton-theme"), so the choice has to travel on the link: ?theme=dark
   or ?theme=light. The page there renders in that theme from its first paint and
   remembers it through Stripe and back.

   ONE listener for every booking link — the nav button, the hero CTA, the bubble,
   the rate card, the week strip, every free calendar cell, the footer — rather than
   threading the theme through each of them, and it cannot be stale: it reads
   <html data-theme> (the same source of truth ThemeToggle uses) at the moment of the
   press, so a visitor who switched theme a second ago carries the new one.

   pointerdown and keydown run BEFORE the browser follows the link, including a
   middle-click or a long-press "open in new tab", which read the href only then. */
function stamp(e: Event) {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || !a.href.startsWith(BOOK_COURT_URL)) return;
  try {
    const url = new URL(a.href);
    url.searchParams.set("theme", document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    a.href = url.toString();
  } catch {
    /* an unparseable href is left exactly as it was */
  }
}

export default function BookingThemeCarry() {
  useEffect(() => {
    const events = ["pointerdown", "keydown", "click", "auxclick", "contextmenu"] as const;
    for (const ev of events) document.addEventListener(ev, stamp, true);
    return () => {
      for (const ev of events) document.removeEventListener(ev, stamp, true);
    };
  }, []);
  return null;
}
