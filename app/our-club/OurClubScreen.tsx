"use client";

import type { ReactNode } from "react";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND, BAND_STAMP } from "../components/ScreenChrome";
import ScreenStamp from "../components/ScreenStamp";
import { BG, INK, BOX } from "../components/tv-palette";
import s from "../exit/exit.module.css";
import h from "./our-club.module.css";

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
     MIDDLE, FIXED — his four asks, in his order, one tile each (ASKS). They never
       move, so whoever is reading one is not cut off.

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

type Message = {
  /** The small tracked line over the headline: [plain, in the accent]. */
  kicker: [string, string];
  /** The headline: [white, in the accent]. */
  head: [string, string];
  /** Its size in the 16:9 box's vw, so the longest still fits one line (measured at
   *  1920x1080 on 2026-11-03). */
  headSize: number;
  lead: string;
  /** The sign-off under the tiles. */
  thanks: string;
};

/** In the order he saw them, 2026-11-03. Five, because THE ROUND's keyframes are cut
 *  for five: a sixth needs its window there changed first (our-club.module.css). */
const MESSAGES: Message[] = [
  {
    kicker: ["A neighborhood sports club · ", "open 24/7"],
    head: ["This is", "your club."],
    headSize: 6.2,
    lead: "Open around the clock, run on trust, and looked after by the people who play here. A few small things keep it that way.",
    thanks: "Thank you for treating it like your own.",
  },
  {
    kicker: ["Exton Sports Center · ", "open 24/7"],
    head: ["We trust you", "with the keys."],
    headSize: 5.8,
    lead: "The code, the courts, the lights — yours at any hour. That trust is what keeps Exton open around the clock, and it’s kept by how each of us leaves it.",
    thanks: "Thank you for keeping that trust.",
  },
  {
    kicker: ["A neighborhood sports club · ", "open 24/7"],
    head: ["Leave it better", "than you found it."],
    headSize: 4.9,
    lead: "Someone walks in right after you. Give them the club you’d want to walk into.",
    thanks: "Pass it on.",
  },
  {
    kicker: ["A neighborhood sports club", ""],
    head: ["Open 24/7.", "Kept open by you."],
    headSize: 5.8,
    lead: "We can stay open around the clock because the players who use Exton look after it. Thank you for being one of them.",
    thanks: "See you on court.",
  },
  {
    kicker: ["A neighborhood sports club · ", "open 24/7"],
    head: ["The next game", "is someone’s too."],
    headSize: 5.4,
    lead: "The court was ready when you walked in, because the players before you left it that way. Do the same for the ones after you.",
    thanks: "Thank you for looking out for each other.",
  },
];

/* His four asks, in his order. Each title is two lines, set by hand: "Lock up before you
   leave" is too long for one line of a quarter-width tile at a size the door can read,
   and four titles of one height keep the four lines under them level. */
const ASKS: Array<{ key: string; title: [string, string]; line: string; icon: ReactNode }> = [
  {
    key: "shoes",
    title: ["Clean", "shoes"],
    line: "Clean, non-marking shoes on every court.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden>
        <path d="M5 35.5V24c0-2.2 1.8-4 4-4h7.5l6 6.2c2.4 2.3 5.6 3.6 9 3.6h5.2c3.6 0 6.3 2.4 6.3 5.7" />
        <path d="M5 35.5h38" />
        <path d="M5 39.5h38" />
        <path d="M18.5 23.5l-3 3M22 27l-3 3" />
      </svg>
    ),
  },
  {
    key: "time",
    title: ["Stick to", "your time"],
    line: "Off court when your booking ends. The next group is waiting.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="25" r="16" />
        <path d="M24 15.5V25l6.5 4" />
        <path d="M19 5h10M24 5v4" />
      </svg>
    ),
  },
  {
    key: "lock",
    title: ["Lock up before", "you leave"],
    line: "Last ones out lock the front door. It doesn’t lock by itself.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden>
        <rect x="10" y="21" width="28" height="21" rx="3.5" />
        <path d="M16 21v-6a8 8 0 0 1 16 0v6" />
        <path d="M24 29.5v5" />
      </svg>
    ),
  },
  {
    key: "clean",
    title: ["Keep it", "clean"],
    line: "Bottles, shuttles and trash leave with you.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden>
        <path d="M11 14h26" />
        <path d="M19.5 14v-3.5h9V14" />
        <path d="M14 14l2 27h16l2-27" />
        <path d="M20.5 20v15M27.5 20v15" />
      </svg>
    ),
  },
];

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
              <li key={r.key} className={`${h.rule} ${s.rise}`} style={at(0.8 + i * 0.18)}>
                <span className={h.glow} style={at(3 + i * 2.5)} aria-hidden />
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
