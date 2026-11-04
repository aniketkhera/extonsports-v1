"use client";
import { useEffect } from "react";
import { launchTagFrom } from "./screen-pure";
import { PLATFORM, readKey } from "./screen-key";
import { BACK_HOLD_MS, handoffUrl, isOn, statusUrl, type ReplaySport } from "./replay-handoff-pure";

/* Sends the badminton or cricket TV to the N95's replay screen while that sport's junior
   academy is on (2026-11-04; the rule and why the screen lives on the N95 are in
   replay-handoff-pure.ts). Draws nothing.

   ONLY A PAIRED TV MOVES. A page with no board key (a laptop, a phone, anyone opening
   extonsports.com/badminton) never leaves: the replay screen is for the TVs only, and the box
   is not reachable from outside the club anyway.

   A TOP-LEVEL NAVIGATION, NOT AN EMBED. This page is https; the box is plain http on the LAN.
   A browser refuses an http video or frame inside an https page, but lets the page itself go
   there. tv-keeper keeps judging the TV by the URL it launched (the TV reports that, not
   where the page went), so it does not fight this, and its hourly reload just brings the TV
   back here for a moment before this sends it on again.

   ONLY WHEN THE BOX SAYS ITS SCREEN IS UP (replay-handoff-pure.ts): the platform answers
   from the N95's own report of the last 90 s, so a box that is down never gets a TV.

   THE BOX SENDS IT BACK with ?replay=back when the session ends, or when it cannot show a
   picture; for BACK_HOLD_MS after that this does nothing, so the TV cannot bounce. */

const CHECK_EVERY_MS = 60_000;
const HOLD_KEY = "exton-replay-back-at";

export default function ReplayHandoff({ sport }: { sport: ReplaySport }) {
  useEffect(() => {
    const key = readKey();
    if (!key) return;
    try {
      const u = new URL(location.href);
      if (u.searchParams.get("replay") === "back") {
        localStorage.setItem(HOLD_KEY, String(Date.now()));
        u.searchParams.delete("replay");
        history.replaceState(null, "", u.pathname + u.search + u.hash);
      }
    } catch { /* storage refused: the hold below simply does not apply */ }
    const held = () => {
      try { return Date.now() - Number(localStorage.getItem(HOLD_KEY) || 0) < BACK_HOLD_MS; } catch { return false; }
    };
    let gone = false;
    const check = async () => {
      if (gone || held()) return;
      try {
        // The N95's own fresh report, through the platform: is its replay screen up?
        const r = await fetch(statusUrl(PLATFORM, sport), { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
        if (!r.ok) return;
        if (isOn(await r.json()) && !held() && !gone) {
          gone = true;
          location.replace(handoffUrl(sport, key, launchTagFrom(location.search)));
        }
      } catch { /* no feed, no hand-off: the court board stays */ }
    };
    const first = setTimeout(check, 3_000);
    const every = setInterval(check, CHECK_EVERY_MS);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [sport]);
  return null;
}
