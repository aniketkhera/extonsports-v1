"use client";

/* The LIVE NOW band on the club's televisions. 2026-11-12.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket: "put up a LIVE NOW sign on the reception, vestibule, cricket and badminton TVs
   (as the case may be for cricket and badminton) when the stream is on. Write somewhere -
   extonsports.com/live", and after seeing three mockups: "i like option B".

   Option B is a full-width red band directly under the header, carrying the address at a
   size that reads from the door. That is the whole point of it: a chip can say that
   something is live, but only a band can carry extonsports.com/live big enough to be read
   by somebody walking in, which is the person the sign is for.

   ⚠️ WHY THE CRICKET AND BADMINTON TVs DO NOT USE THIS, despite being in the ask.
   Those two sets leave extonsports.com during junior academy: ReplayHandoff.tsx navigates
   them to the N95's replay page (10.1.10.124:8090/tv/<sport>) for exactly the sessions
   that are streamed. A band added to SportBoard would therefore be on screen only when the
   sport is NOT streaming, which is never. Their sign belongs on the replay page itself,
   which is court-replay's tv.html in the orangish-cameras repo, and is not this change.

   IT RENDERS NOTHING OFF AIR, so each screen is exactly the screen it was the rest of the
   day — no reserved space, no empty strip.

   LITERALS, NOT TOKENS, like every screen component: globals.css redefines --color-* under
   :root[data-theme="light"] and light is the default, so a screen built on tokens turns
   into dark text on a dark ground with nobody in the room (tv-palette.ts says this at
   length). Sizes are in --vw/--vh, the hundredths of the 16:9 box. */

import { useEffect, useState } from "react";
import { LIVE_STATUS_PATH, pollDelayMs } from "./live-now-pure";
import { bandLine, NO_SPORTS, type LiveSports } from "../../lib/live/sports";
import { INK, LIVE } from "./tv-palette";

type Status = { live: boolean; sports: LiveSports };

/** Strictly the shape we expect. Anything else is "not live" — a wall sign that says
 *  children are on camera had better be right. */
function parseStatus(body: unknown): Status {
  if (typeof body !== "object" || body === null) return { live: false, sports: NO_SPORTS };
  const b = body as { live?: unknown; sports?: unknown };
  if (b.live !== true) return { live: false, sports: NO_SPORTS };
  const s = b.sports;
  const on = (k: "badminton" | "cricket") =>
    typeof s === "object" && s !== null && (s as Record<string, unknown>)[k] === true;
  return { live: true, sports: { badminton: on("badminton"), cricket: on("cricket") } };
}

export default function LiveBand() {
  const [status, setStatus] = useState<Status>({ live: false, sports: NO_SPORTS });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    async function look(): Promise<void> {
      if (stopped) return;
      try {
        const res = await fetch(LIVE_STATUS_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = parseStatus(await res.json());
        failures = 0;
        if (!stopped) setStatus(next);
      } catch {
        failures += 1;
        /* Two strikes, as the website's badge uses. One dropped request on club wifi is
           not evidence a session ended, and a band flashing on and off on a wall is worse
           than a band that is a minute late. */
        if (!stopped && failures >= 2) setStatus({ live: false, sports: NO_SPORTS });
      }
      if (!stopped) {
        clearTimeout(timer);
        timer = setTimeout(look, pollDelayMs(failures));
      }
    }

    void look();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  if (!status.live) return null;

  return (
    <div
      role="status"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "calc(2.2 * var(--vw))",
        background: LIVE,
        color: INK,
        padding: "calc(1.1 * var(--vh)) calc(2 * var(--vw))",
        marginTop: "calc(1.4 * var(--vh))",
        fontFamily: "var(--font-cond)",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        fontSize: "calc(1.6 * var(--vw))",
        lineHeight: 1,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "calc(0.8 * var(--vw))", fontSize: "calc(2.1 * var(--vw))", fontWeight: 700 }}>
        <span
          aria-hidden
          style={{
            width: "calc(1 * var(--vw))",
            height: "calc(1 * var(--vw))",
            borderRadius: "50%",
            background: "currentColor",
            flex: "none",
            animation: "tv-live-blink 1.4s ease-in-out infinite",
          }}
        />
        Live now
      </span>
      <span>
        {bandLine(status.sports)} — watch at{" "}
        <span style={{ fontWeight: 700, letterSpacing: "0.08em" }}>extonsports.com/live</span>
      </span>
      {/* The keyframes ride with the component: these screens import no global stylesheet
          of their own, and a wall sign should not depend on one being loaded. */}
      <style>{"@keyframes tv-live-blink{0%,100%{opacity:1}50%{opacity:.32}}"}</style>
    </div>
  );
}
