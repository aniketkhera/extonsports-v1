"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import TrackBeacon from "mailer-admin/TrackBeacon";
import WhatsAppFab from "./WhatsAppFab";
import BookingThemeCarry from "./BookingThemeCarry";
import { SCREEN_PATHS } from "./tv-screens";

// The site-wide extras the root layout used to mount directly, now skipped on pages that
// are screens rather than places a person visits.
//
// /comingsoon is what the Exton wall TVs show (added 2026-09-19). A TV loads it once and stays
// up for days, reloading whenever the TV power-cycles, so TrackBeacon would count a
// television as a visitor in /admin/visits every morning, and the WhatsApp bubble would
// sit on the screen forever with nobody to tap it. Vercel Analytics goes for the same
// reason as the beacon.
//
// /board is the court board the same TVs show from 2026-10-05, and it is here for exactly
// the same three reasons — it is a screen, not a visit. It polls every minute for weeks, so
// it is the worst possible thing to let near the beacon.
//
// /reception is the desk screen added 2026-10-07 — same three reasons again. It was
// missed on its first build and the WhatsApp bubble duly appeared in the corner of a
// television, which is the visible half of the problem; the invisible half was a TV
// counting itself as a daily visitor.
//
// /exit is the promotion screen facing the exit door, added 2026-10-20 — listed on
// day one so it never repeats /reception's first week.
//
// /vestibule and /outside came later on 2026-10-20, when every TV got an address of its
// own. From then on the list is SCREEN_PATHS in tv-screens.ts, which is built from the
// TV registry: each TV's route is in it automatically, so the next TV to be installed
// cannot repeat /reception's first week either. /exit, /board and /comingsoon are
// listed there by hand, because none of them is a TV's own address.

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname && SCREEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return (
    <>
      <WhatsAppFab />
      <BookingThemeCarry />
      <Analytics />
      <TrackBeacon />
    </>
  );
}
