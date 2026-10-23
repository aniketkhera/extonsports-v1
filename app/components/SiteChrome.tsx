"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import TrackBeacon from "mailer-admin/TrackBeacon";
import WhatsAppFab from "./WhatsAppFab";
import BookingThemeCarry from "./BookingThemeCarry";
import { SCREEN_PATHS } from "./tv-screens";
import { PACK_PATH } from "../../lib/booking";

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

// /my-bookings, 2026-10-20 — a guest's own bookings and their Cancel. A different reason
// from the screens, and a stricter one: this page is PRIVATE.
//   • Vercel Analytics and TrackBeacon read location.href, and the visit log is read by
//     staff; one person's bookings page has no business in either. (/my-bookings/link
//     carries a sign-in token in its query; it is a route that 303s, never rendered, but
//     the rule is simpler kept for the whole path.)
//   • the green WhatsApp bubble sits bottom-right — exactly over a row's Cancel button on
//     a phone — and links to app.orangish.io, an Orangish address the owner wants kept
//     off this path (2026-10-18: guests see extonsports.com only).
// BookingThemeCarry goes too (second review, 2026-10-20): it only rewrites links to the
// platform's booking page, and nothing on this path links there any more — the empty
// state's "Book a court or lane" goes to this site's own home page instead.
const PRIVATE_PATHS = ["/my-bookings"];

// /court-packs (/5-pack until 2026-10-22), 2026-10-21 (the court pack's buy page and its terms) — PUBLIC, so analytics
// and the beacon stay, but not the bubble: on a phone the 82px "Book a court or lane"
// circle floats over the buy form's tick box and its full-width Pay button (seen in the
// S3 render check), and it leads away from the purchase to the card booking form. The
// page's own "Already have a pack? Book a court" is its way to the form.
const NO_BUBBLE_PATHS = [PACK_PATH];

const under = (pathname: string, p: string) => pathname === p || pathname.startsWith(`${p}/`);

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname && SCREEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  if (pathname && PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  const bubble = !(pathname && NO_BUBBLE_PATHS.some((p) => under(pathname, p)));
  return (
    <>
      {bubble && <WhatsAppFab />}
      <BookingThemeCarry />
      <Analytics />
      <TrackBeacon />
    </>
  );
}
