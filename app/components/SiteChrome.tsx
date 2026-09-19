"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import TrackBeacon from "mailer-admin/TrackBeacon";
import WhatsAppFab from "./WhatsAppFab";

// The site-wide extras the root layout used to mount directly, now skipped on pages that
// are screens rather than places a person visits.
//
// /reception is the wall TV at the front desk (added 2026-09-19). It loads once and stays
// up for days, reloading whenever the TV power-cycles, so TrackBeacon would count a
// television as a visitor in /admin/visits every morning, and the WhatsApp bubble would
// sit on the screen forever with nobody to tap it. Vercel Analytics goes for the same
// reason as the beacon.
const SCREEN_PATHS = ["/reception"];

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname && SCREEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return (
    <>
      <WhatsAppFab />
      <Analytics />
      <TrackBeacon />
    </>
  );
}
