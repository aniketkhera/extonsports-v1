"use client";

import w from "./workshop.module.css";

/* WHICH PROMOTIONS ARE UP, AND WHICH SLOT EACH HOLDS (2026-10-21).
   ──────────────────────────────────────────────────────────────────────────
   Moved out of ExitScreen.tsx when the vestibule screen took the same promotions
   on its right half (Aniket, 2026-10-21: "i also want the notices for starter
   pack, sera workshop, and the birthday"). One copy, so the two walls put up and
   take down the same panels at the same moment, with no deploy.

   In order: Phoenix Throwball (always, since 2026-10-26, PhoenixHero.tsx), Chester
   County Cricket Academy (always, since 2026-10-22, CccaHero.tsx), and the workshop
   until 8pm on 30 Oct (its panel and page were deleted 2026-11-03). The birthday greeting came down at midnight on the 21st, as
   asked ("After midnight, remove that page"), and its code went with the CCCA change.

   The Squash Starter Pack came OFF both walls on 2026-10-26, Phoenix taking its place
   (Aniket: "let's remove the page from vestibule on squashtigers starter pack and show
   'Exton Sports Center - now home to the Phoenix Throwball Team!'", then "and also on
   the 'outside' screen too"). StarterHero.tsx is kept: put "starter" back in `up` and
   both screens show it again, since each renders exactly the panels listed here.

   A dated panel joins and leaves on the SCREEN's clock, not at build time: a set
   stays up for weeks between reloads, and a panel has to come down by itself on
   the day. The ticker's server snapshot is 0, so the server and the first client
   render show only the always-on panels and nothing mismatches; a dated one joins
   a moment after the page starts. (No panel is dated since the workshop went, so the
   clock went too, 2026-11-03: a new dated panel brings back `useTick(makeTicker(30_000))`
   from components/ticker and a `now` test here, as the workshop had.)

   Each panel 5 s. Two panels swap on a 10 s clock, three on a 15 s one; `slot(key)`
   is the class that gives that panel its turn (workshop.module.css, THE SWAP).
   ⚠️ There are keyframes for two and three panels only. A fourth needs its own
   set there first: until then it would sit on top of the others for good.

   THE TWO WALLS PART (2026-11-03). Aniket: "we have that vestibule tv - have this 5/10
   pack - remove others (like that Phoenix throwball and CCCA notice)", then, on the
   DIWALI2026 coupon, "push it to vestibule". So the vestibule's list is the court packs
   alone (PacksHero.tsx); one panel takes no slot class and the screen draws no dots. The
   exit door's list keeps Phoenix and CCCA, but since the same day the outside set shows
   a message of its own ("our-club", tv-screens.ts), so only the /exit preview address
   draws it. Nothing is deleted: put a key back in a list to bring a panel back. */
export type PromoKey = "phoenix" | "starter" | "ccca" | "packs";

/** Which wall is asking: the vestibule's right half, or the exit-door screen. */
export type PromoWall = "vestibule" | "exit";

export function usePromos(wall: PromoWall): {
  /** The panels up now, in the order they take their turns. */
  up: PromoKey[];
  /** The swap class for that panel ("" when it is not up, or alone). */
  slot: (key: PromoKey) => string;
} {
  const up: PromoKey[] = wall === "vestibule" ? ["packs"] : ["phoenix", "ccca"];
  const classes = up.length === 2 ? [w.slideA, w.slideB] : up.length === 3 ? [w.slide3a, w.slide3b, w.slide3c] : [];
  const slot = (key: PromoKey): string => classes[up.indexOf(key)] ?? "";
  return { up, slot };
}
