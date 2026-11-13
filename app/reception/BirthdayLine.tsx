"use client";

import { useEffect, useState } from "react";
import b from "./birthday.module.css";

/* A birthday greeting on the cricket TV, for ONE evening (2026-11-13).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, 18:00 on the day: "On the cricket screen at exton, somewhere, add the
   following 'Happy Birthday Avyukth Tharun'. Take it off at midnight today."

   Drawn in the cricket box's title row, centred between CRICKET and the lights chip,
   ABSOLUTE so the row keeps its height: the NOW area and COMING UP below it are
   measured to the pixel (SportBoard.tsx). Only RENDER["cricket-board"] in TvScreen.tsx
   passes `birthday`, so no other screen changes.

   It goes off on the SCREEN's own clock, checked every 30 s, at ENDS_AT, so midnight
   needs no deploy and no reload. Shown only after hydration (false on the server), so
   the server's clock and the TV's can never disagree about the first paint. The code
   itself comes out in a follow-up commit, as the 21 Oct exit-door greeting's did
   (da3cb7f).

   While the cricket academy is on, the TV is not on this page at all but on the N95's
   replay screen (ReplayHandoff.tsx); the greeting was put on that screen separately,
   on the box, for 13 Nov only. */

export const BIRTHDAY = {
  name: "Avyukth Tharun",
  /** Midnight EST, the start of Sat 14 Nov 2026 (EST is UTC-5 from 1 Nov). */
  endsAt: "2026-11-14T05:00:00Z",
} as const;

const ENDS_MS = Date.parse(BIRTHDAY.endsAt);

export function birthdayOn(nowMs: number): boolean {
  return Number.isFinite(nowMs) && nowMs < ENDS_MS;
}

export function useBirthday(enabled: boolean): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const check = () => setOn(birthdayOn(Date.now()));
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [enabled]);
  return enabled && on;
}

/* Sizes are in the box's scaled --vw (SportBoard's SCALED), like the title beside it.

   BOXED AND GLOWING (2026-11-13, Aniket on the first version: "Put a box around it. And
   glow it"; birthday.module.css). The box is taller than the title's line, and below the
   title row is COMING UP's heading (195px at 1080p, measured), so the box is pinned by its
   TOP, 0.65 scaled vw (20px) above the row: 117-188px at 1920x1080, inside the panel's
   border (106px) and clear of COMING UP. Smaller type than the unboxed line (1.45 against
   1.65) so the box fits that band. */
export default function BirthdayLine() {
  return (
    <div
      className={`text-cond ${b.box}`}
      data-birthday
      aria-label={`Happy birthday, ${BIRTHDAY.name}`}
      style={{
        left: "50%", top: "calc(-0.65 * var(--vw))", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: "0.45em",
        whiteSpace: "nowrap", pointerEvents: "none", lineHeight: 1,
        fontSize: "calc(1.45 * var(--vw))", letterSpacing: "0.08em",
        padding: "0.25em 0.8em",
        color: "#FFC94A",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
      <img src="/reception/cricket-ball.svg" alt="" aria-hidden style={{ height: "0.8em", width: "auto", maxWidth: "none" }} />
      <span>
        HAPPY BIRTHDAY <span style={{ color: "#FFFFFF" }}>{BIRTHDAY.name.toUpperCase()}</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
      <img src="/reception/cricket-ball.svg" alt="" aria-hidden style={{ height: "0.8em", width: "auto", maxWidth: "none" }} />
    </div>
  );
}
