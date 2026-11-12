"use client";

import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND, BAND_STAMP } from "../components/ScreenChrome";
import ScreenStamp from "../components/ScreenStamp";
import { BG, INK, BOX } from "../components/tv-palette";
import s from "../exit/exit.module.css";
import h from "./our-club.module.css";
import { MESSAGES, ASKS } from "./words";

/* The players' message, on the exit-door TV (2026-11-03).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "on the outside TV - I want a message - let's draft it - "we are a
   neighborhood sports facility. we rely on players to keep the facility orderly for
   the next set of players. by keeping it open 24x7, we are able to give more options
   to players, but at the same time need an honor code to be maintained. please use
   clean shoes, stick to your time, lock up before you leave, keep the place clean"".

   The first draft was headed OUR HONOR CODE. His answer: "what we want to do is to
   imbibe a sense of ownership among the players. Callign it honor code is too direct.
   Let's think of a message that connects emotionally". Five openings were drawn; he
   chose all of them: "keep it dark only. lets rotate the headline messages with the
   bottom 4 boxes etc same.. push it to the outside TV". So:

     TOP, ROTATING — five messages (MESSAGES), 8 s each, a 40 s round: the small line
       over the headline, the headline, the line under it, and the sign-off at the foot.
     MIDDLE, FIXED — his asks, in his order, one tile each (ASKS). They never move,
       so whoever is reading one is not cut off. The fifth, parking, joined 2026-11-05
       in a red border with a pulsing red glow (words.tsx, our-club.module.css .alert).
       The sixth, RECORDING 24/7, joined 2026-11-12: the court-camera notice in the
       sign's yellow, with no glow (.notice).

   THE LOCK-UP LINE says what the key-box emails say (orangish-app lib/lockbox-guide.ts,
   2026-10-27): the last ones out lock the front door with the key, because it does not
   lock by itself. Two places telling a player different things about the door is how a
   door is left open overnight.

   THE ROTATION IS CSS ONLY (our-club.module.css, THE ROUND): the five messages sit in
   one grid cell and each fades in for its 8 s on one shared 40 s clock, staggered by
   animation-delay — opacity only, as the weak VIZIO browsers need, and no JavaScript
   timer to stop if the page's script stalls. The cell is as tall as the tallest
   message, so the tiles under it never jump.

   No data feed and no promotions: nothing changes but the clock. It reloads itself on a
   deploy like every other screen. No heartbeat in here: TvScreen.tsx sends it, named
   by the TV ("outside"). Which TV shows this is tv-screens.ts (`shows: "our-club"`). */

/** One message's turn: 8 s of the 40 s round. */
const TURN_S = 8;

/* The tiles' entrance, in seconds after load and again every 40 s (exit.module.css .rise). */
const at = (seconds: number) => ({ animationDelay: `${seconds}s` });

export default function OurClubScreen() {
  useReloadOnDeploy();
  return (
    <div style={{ position: "absolute", inset: 0, background: BG }}>
      {/* The same 16:9 box and paddings as /exit and /reception (BOX), so the header
          and the band land on the same pixels on every wall. */}
      <div
        style={{
          ...BOX,
          position: "absolute", background: BG, color: INK,
          width: "calc(100 * var(--vw))", height: "calc(100 * var(--vh))",
          left: "calc(50% - 50 * var(--vw))", top: "calc(50% - 50 * var(--vh))",
          display: "flex", flexDirection: "column", padding: `calc(2.7 * var(--vh)) calc(2.2 * var(--vw)) calc(${BAND_GAP} + ${BOOK_BAND})`,
          overflow: "hidden",
        }}
      >
        <ScreenHeader />

        <main className={h.body}>
          <div className={h.round}>
            {MESSAGES.map((m, i) => (
              <div key={m.head.join(" ")} className={h.turn} style={{ animationDelay: `${i * TURN_S}s` }}>
                <p className={h.kicker}>
                  {m.kicker[0]}
                  <b>{m.kicker[1]}</b>
                </p>
                <h1 className={h.title} style={{ fontSize: `calc(${m.headSize} * var(--vw))` }}>
                  {/* One flex item: as two, the space between them would collapse. */}
                  <span className={h.titleText}>
                    {m.head[0]} <span>{m.head[1]}</span>
                  </span>
                </h1>
                <p className={h.lead}>{m.lead}</p>
              </div>
            ))}
          </div>

          <ol className={h.rules}>
            {ASKS.map((r, i) => (
              <li key={r.key} className={`${h.rule} ${r.alert ? h.alert : ""} ${r.notice ? h.notice : ""} ${s.rise}`} style={at(0.8 + i * 0.18)}>
                {r.alert ? (
                  <span className={h.alertGlow} aria-hidden />
                ) : r.notice ? null : (
                  <span className={h.glow} style={at(3 + i * 2.5)} aria-hidden />
                )}
                <span className={h.icon}>{r.icon}</span>
                <span className={h.ruleTitle}>
                  {r.title[0]}
                  <br />
                  {r.title[1]}
                </span>
                <span className={h.ruleLine}>{r.line}</span>
              </li>
            ))}
          </ol>

          {/* The sign-off turns with its message: the same delays on the same clock. */}
          <div className={h.round}>
            {MESSAGES.map((m, i) => (
              <p key={m.thanks} className={`${h.thanks} ${h.turn}`} style={{ animationDelay: `${i * TURN_S}s` }}>
                {m.thanks}
              </p>
            ))}
          </div>
        </main>

        <BookingBand showBookQr={false} stamp={<ScreenStamp style={BAND_STAMP} />} />
      </div>
    </div>
  );
}
