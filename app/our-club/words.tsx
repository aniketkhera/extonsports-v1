import type { ReactNode } from "react";

/* The players' message, in one place (2026-11-03): the exit-door TV (OurClubScreen.tsx) rotates
   all five MESSAGES over the ASKS, and extonsports.com's About section (components/OurClubNote.tsx)
   prints the first message and the same asks, less any marked `wallOnly`. One copy, so the wall and the website can never
   tell a player two different things. Why each line says what it says is in OurClubScreen.tsx's
   header; the lock-up line matches the key-box emails (orangish-app lib/lockbox-guide.ts). */

export type Message = {
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
export const MESSAGES: Message[] = [
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
/** THE FIFTH TILE (2026-11-05, Aniket: "add one more - Park in SQUASHTIGERS parking slots only -
 *  highlight it (glow) or make it red border"). `alert` gives it the red border and glow, and
 *  `wallOnly` keeps it off extonsports.com, which he did not ask to change.
 *
 *  `web`, where set, is what extonsports.com prints instead of `line` (2026-11-03): the wall by the
 *  door tells players the door does not lock by itself, as the key-box emails do; the public site
 *  does not tell the world. Found by the 11-03 publishable-features audit. */
/** THE SIXTH TILE (2026-11-12, Aniket: "make it RECORDING 24/7. then push this as one of the boxes
 *  on the outside TV", about the new court-camera sign). Not an ask but the camera notice, so
 *  `notice` draws it in the sign's yellow rather than the asks' orange; `wallOnly` keeps it off
 *  extonsports.com, which he did not ask to change. Every word here must stay true of the cameras
 *  (orangish-app docs/camera-privacy.md): video only with no audio track, and footage kept 15 days.
 *  If either changes, change this line the same day. */
export const ASKS: Array<{ key: string; title: [string, string]; line: string; web?: string; icon: ReactNode; wallOnly?: true; alert?: true; notice?: true }> = [
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
    web: "Last ones out, please lock the front door.",
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
  {
    key: "parking",
    title: ["Park in", "SQUASHTIGERS"],
    line: "Park in SQUASHTIGERS parking slots only.",
    wallOnly: true,
    alert: true,
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden>
        <rect x="7" y="7" width="34" height="34" rx="5" />
        <path d="M19 35V14h7.5a6.5 6.5 0 0 1 0 13H19" />
      </svg>
    ),
  },
  {
    key: "recording",
    title: ["Recording", "24/7"],
    line: "Video only, no sound. Kept 15 days.",
    wallOnly: true,
    notice: true,
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden>
        <rect x="5" y="14" width="26" height="20" rx="3.5" />
        <path d="M31 21.5l12-6.5v18l-12-6.5" />
        <circle cx="12" cy="20.5" r="1.6" />
      </svg>
    ),
  },
];
