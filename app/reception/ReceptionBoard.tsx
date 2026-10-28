"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { makeTicker, useTick } from "../components/ticker";
import Image from "next/image";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND, BAND_STAMP, secondTicker } from "../components/ScreenChrome";
import ScreenStamp from "../components/ScreenStamp";
import { BG, INK, EMBER, GREEN, LABEL, NEXT_VAL, NEXT_LBL, MUTED, RULE_SOFT, PANEL, BOX } from "../components/tv-palette";
import {
  PLATFORM, readKey, clubNow, span, clock, holderLabel, brandFor, sessionOf, splitUpNext, lightChip, SESSION_TEXT, SPORT_OBJECT,
  courtNudges, nudgeFace, clubInstant, startOf, endOf, bandKey,
  type BrandKey, type LightChip, type Lights, type NamedBlock, type NamedSlots, type SessionKey, type NudgeFace,
} from "../board/board-lib";

/* The clock is an external store, shared with /comingsoon — see
   app/components/ticker.ts for why it is not useState + useEffect. The visible
   seconds tick in components/ScreenChrome (the header, since 2026-10-20). */
/** Decides which hour counts as "now". Slower on purpose — see the board below.
 *  On the wall clock's quarter minutes since 2026-10-25 (ticker.ts), so it lands on
 *  the second a booking ends — the OFF COURT countdown's TIME UP and the next group's
 *  ON NOW change together, not up to 15 s apart. */
const quarterMinuteTicker = makeTicker(15_000, { align: true });

/* The reception desk screen — the 55" M55Q6-L4 at 10.1.10.72.
   ──────────────────────────────────────────────────────────────────────────
   Built 2026-10-07 at Aniket's request, as a second layout over the same feed
   /board uses. /board is one row per court, ten rows; this one groups by SPORT
   and carries the partner logos. The vestibule 75" shows this board too, not
   /board (tv-keeper's logs, 2026-10-20): at /reception until tv-keeper is
   re-pointed at its own /vestibule, which renders this same component
   (app/components/tv-screens.ts). Its key has names_visible off, so it names
   exactly who the public page names.

   WHY GROUPED, AND WHY MERGED. Philadelphia Badminton holds all three
   badminton courts for the same four hours, which /board draws as three
   identical rows. On a desk screen that is three quarters of the badminton
   section spent repeating one fact. Here a holder with the same hours across
   several courts collapses to one entry reading "Courts 1–3", and the space
   that frees goes into type a person can read standing at the desk.

   ⚠️ MERGING IS BY (holder, from, to) AND MUST STAY THAT WAY. Two different
   members on two courts at the same hour are two bookings and must render as
   two — collapsing on time alone would put one person's initials over someone
   else's court. Same trap the platform's court-slots dedup key guards.

   ⛔ NO EXTRA NAMING RULES HERE. What `who` may contain is settled server side
   in the platform's lib/court-holders.ts (programme not roster for squads, the
   coach not the student for lessons, 'Reserved' for anyone under 18). This
   file prints what it is given — see holderLabel in board-lib.

   It runs unattended for weeks, so: a failed poll keeps the last good payload
   rather than blanking, "today" is recomputed from the clock on every tick
   rather than taken from days[0], and nothing accumulates in state. */

/* ── THE TV PALETTE ──────────────────────────────────────────────────────────
   BG, INK, EMBER, GREEN, the alpha whites and PANEL live in
   components/tv-palette.ts since 2026-10-20 — moved unchanged, with the
   reasoning (why so bright, why literals and never --color-* tokens), when /exit
   took the same header and band. Only the board's own colours stay below. */
/* ── The three sport boxes, lit ───────────────────────────────────────────
   Asked for 2026-10-08: an ember border on each box, and shading so a box
   reads as a raised object rather than a flat patch of lighter navy.

   Everything here is in vw/vh for the same reason every size on this screen
   is: the two televisions are a 55" and a 75" and we do not control whether
   the browser reports 1920 or 3840 CSS pixels. A 2px border is hairline on
   one of them and solid on the other; 0.09vw is the same line on both.

   The light is from ABOVE — a brighter top edge, a darker foot, and a warm
   ember wash in the top corner. One direction, consistently, is what makes
   three boxes read as three objects on a wall instead of three gradients.
   Shadow opacity is high because it is cast on #0B1623: a 0.25 shadow that
   looks right on a laptop is invisible from fifteen feet on a dark screen. */
export const PANEL_LIT =
  "linear-gradient(180deg, rgba(255,255,255,0.145) 0%, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.018) 100%)";
export const PANEL_GLOW =
  "radial-gradient(120% 75% at 50% -12%, rgba(248,155,114,0.22) 0%, rgba(248,155,114,0) 72%)";
/* ⚠️ THE BORDER IS THE BRAND ORANGE AT FULL STRENGTH, not the pale header
   salmon at half opacity. The first attempt (2026-10-08) used EMBER #FFBE97 at
   0.52 and read as a warm grey line from the desk — "orange should be visible".
   #F89B72 is the same orange the website uses, and at full opacity it still
   belongs to the board rather than fighting the GREEN "ALL OPEN". */
export const PANEL_BORDER = "#F89B72";
/* The brand orange as a TEXT colour: JUNIOR COACHING. OPEN PLAY is white — never
   GREEN, which on this board means a free court ("ALL OPEN"; "N OF 3 FREE NOW" until 2026-10-16),
   and a green "OPEN PLAY" would read as "court open" from the desk. */
const SESSION_ORANGE = "#F89B72";
/* Only Girls – Free Coaching (2026-10-15): gold, filled like JUNIOR COACHING so it reads
   as a tag of the same family, and not GREEN for the reason above — doubly so here,
   where the word FREE in green would tell the desk the lane is free. The same amber
   the public calendar paints CCCA's hours, at full strength, so the hour carries
   CCCA's colour on both; a yellow, not an orange, so it never reads as JUNIOR
   COACHING from across the room. */
const SESSION_GOLD = "#FFC43D";
/* OFF COURT (2026-10-25): the countdown, the TIME UP plate and the edge on the courts
   another party is waiting for. A hot red-orange, so it belongs to no other meaning on
   this board: redder and far more saturated than SESSION_ORANGE (JUNIOR COACHING, the
   lights' countdown), nowhere near SESSION_GOLD or the lights' yellow, and ⛔ never
   GREEN, which means a court is free. ~5.6:1 on BG, for type this size. */
const OFF_COURT = "#FF5B45";
export const PANEL_SHADOW = [
  "0 calc(1.7 * var(--vh)) calc(3.8 * var(--vh)) rgba(0,0,0,0.66)",            // the box sits off the wall
  "0 calc(0.5 * var(--vh)) calc(1.1 * var(--vh)) rgba(0,0,0,0.45)",            // the contact shadow under it
  "0 0 calc(1.4 * var(--vh)) rgba(248,155,114,0.22)",          // the edge picks up its own light
  "inset 0 calc(0.18 * var(--vh)) 0 rgba(255,255,255,0.34)",   // lit top edge
  "inset 0 calc(-0.45 * var(--vh)) calc(1 * var(--vh)) rgba(0,0,0,0.38)",      // shaded foot
].join(", ");

const SPORT_ORDER = ["Badminton", "Cricket", "Squash"];

/* The object beside each sport's title (2026-10-16) — a shuttle, a cricket ball, a
   squash ball. What they are, why there is no green in them, and which file is
   which sport: SPORT_OBJECT in board-lib, shared with /board. How they sit here:

   PLACED SO IT COSTS NO HEIGHT. Each SVG is drawn with its ground line at 76% of
   its height, and the title's span puts that line on the text baseline. Absolute,
   so the title row stays one line of type; in flow, even this small, it would have
   clipped the NOW list. All in em of the title (1.5vw), so it is locked to the
   word at any screen shape — it was in vh first, and on the public page in a
   portrait phone or tablet the vh image outgrew the vw type and rose through the
   panel's top border (review, 2026-10-16). The numbers, at 16:9 the same as that
   first build: height 1.575em (= 4.2vh); top = the baseline's depth in the span
   (1.182em, Oswald's ascent as measured on the live board) minus 76% of the
   height (1.197em) = -0.015em; 0.6em (= 0.9vw) after the word.
   Measured 2026-10-16 at 1080p with three groups on court in every panel — the
   case with ~6px of NOW height to spare — the image clears the panel's top border
   by ~6.6px and the first live booking by ~2.7px, and the NOW list is untouched.
   A sport not listed there simply has no object. */

/** One holder's hours, after courts have been merged. */
export type Entry = {
  /** Club-local YYYY-MM-DD. Needed now that the list runs past today. */
  date: string;
  from: number;
  to: number;
  who: string;
  brand: BrandKey | null;
  /** A partner's session: junior coaching or open play for Philadelphia Badminton
   *  (by its timetable), junior coaching for CCCA and SquashTigers — except CCCA's
   *  free girls' hour, 2026-10-15; null for everything else. */
  session: SessionKey | null;
  /** Court labels in the order they appear, e.g. ["1","2","3"]. */
  courts: string[];
  /** The OFF COURT countdown on this entry, when it ends inside the lead (2026-10-25);
   *  only on a screen that asked for nudges. See courtNudges in board-lib. */
  nudge?: EntryNudge;
};

/** One entry's countdown: what courtNudges said for its courts, folded together. */
export type EntryNudge = {
  /** "next" when ANY of its courts has another party next — that is the one that hurts. */
  kind: "next" | "free";
  /** The end, as an instant on this TV's clock, so the second-by-second face needs no
   *  date maths. */
  endMs: number;
  /** "next": the earliest of the next parties' starts, club-local minutes from today. */
  nextAt?: number;
  /** The courts the line is about: those another party is waiting for, or those free after. */
  courts: string[];
};

export type Panel = {
  sport: string;
  /** Every court label in this sport, in court order — one box each. */
  labels: string[];
  now: Entry[];
  /** Nobody on court: the next booking(s), shown big in place of ALL OPEN. */
  upNext: Entry[];
  upcoming: Entry[];
  /** The lights chip, or null for a sport whose lights are not automated — and
   *  for every sport on the unkeyed page, whose feed has no `lights`. */
  light: LightChip | null;
};

/* How many bookings to list under the live one. Five on 8 Oct 2026, then ten
   later the same day — Aniket's reasoning being that with only 3 badminton,
   3 cricket and 4 squash courts, each bookable individually, a busy evening
   produces rows faster than five can show, and the panel has the room.

   Ten is close to the ceiling. Measured at 720p, a panel with a live booking
   AND ten rows comes to roughly 490px of the ~640px available, so there is
   headroom but not another ten. If this grows again the row height has to
   come down with it. */
const UPCOMING_COUNT = 10;

/* How many simultaneous starts UP NEXT shows in the big area — see splitUpNext in
   board-lib. Two, because the UP NEXT line costs about one entry's lockup row:
   measured 2026-10-16 at 1080p, the line plus two entries with the big boxes is
   ~400px of the ~534px NOW area, and a third (~185px) would push it past the
   bottom. */
const UP_NEXT_MAX = 2;

/* The booking band at the foot of the screen (2026-10-18) is drawn by BookingBand in
   components/ScreenChrome, shared with /exit since 2026-10-20 — its sizes, its QR
   and the reasoning behind both are there. BAND_GAP + BOOK_BAND is what the box
   keeps clear for it at the bottom. */

/* Blocks -> entries, by cutting the day into TIME BANDS.
   ──────────────────────────────────────────────────────────────────────────
   This grouped on (date, holder, from, to) until 8 Oct 2026. That matched the
   feed's own shape and was wrong on screen, for a reason that is not obvious:

   THE FEED HAS ALREADY COALESCED. lib/court-slots.ts keys its runs on
   `date|court|kind|who`, so two bookings by the same person back to back on
   ONE court arrive as a single run with the boundary between them erased.
   Aniket holding badminton 1, 2, 3 from 06:00 and keeping 1 and 3 until 08:00
   therefore arrived as: court 1 "06:00-08:00", court 3 "06:00-08:00", court 2
   "06:00-07:00" — because court 2's 07:00 hour belongs to somebody else and
   could not coalesce. Grouping on (from, to) then produced "6-8 courts 1, 3"
   and "6-7 court 2", and the 6-7 row named ONE court when three were his.

   So the boundaries are taken from every block in the sport, not from each
   block alone: slice at every start and stop, work out who holds what in each
   slice, then stitch adjacent slices back together where nothing changed.
   A reader gets "6-7, courts 1, 2, 3" then "7-8, courts 1, 3".

   ⚠️ STILL NEVER GROUPED ON TIME ALONE. Within a band the rows are split by
   HOLDER, so two members sharing an hour on different courts stay two rows —
   collapsing them would put one person's name over the other's court. */
function mergeBlocks(blocks: NamedBlock[], label: Map<string, string>): Entry[] {
  const byDate = new Map<string, NamedBlock[]>();
  for (const b of blocks) {
    const list = byDate.get(b.date);
    if (list) list.push(b);
    else byDate.set(b.date, [b]);
  }

  const out: Entry[] = [];
  /** Each row's bandKey, so the stitch below joins only a row of the same key. */
  const keyOf = new Map<Entry, string>();
  const sortCourts = (xs: string[]) =>
    xs.sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

  for (const [date, list] of byDate) {
    /* Every instant where anything in this sport starts or stops. Slicing on
       these and not on the blocks themselves is the whole point — see above. */
    const bounds = [...new Set(list.flatMap((b) => [b.from, b.to]))].sort((a, b) => a - b);

    for (let i = 0; i < bounds.length - 1; i++) {
      const from = bounds[i];
      const to = bounds[i + 1];
      const covering = list.filter((b) => b.from <= from && b.to >= to);

      /* Keyed on the SESSION as well as the holder (2026-10-14): PBA's junior
         coaching and its open play share the holder text, and keyed on that
         alone the 7:30 split would be grouped straight back into one row.
         And for an unnamed holder, on its own run too (bandKey in board-lib,
         2026-10-25): PRIVATE is everybody without a name, not one person. */
      const byWho = new Map<string, Entry>();
      for (const b of covering) {
        const key = bandKey(b);
        const found = byWho.get(key);
        if (found) found.courts.push(label.get(b.courtId) ?? "");
        else {
          byWho.set(key, {
            date, from, to, who: holderLabel(b), session: sessionOf(b),
            brand: brandFor(b), courts: [label.get(b.courtId) ?? ""],
          });
        }
      }

      for (const [key, band] of byWho) {
        sortCourts(band.courts);
        /* Re-join a band to the one before it when NOTHING about it changed —
           same holder, same courts, and butted right up against it. Without
           this, one member booking an hour on court 2 would chop a four-hour
           academy hold on courts 1 and 3 into separate rows either side of it,
           for no gain, and eat the ten-row budget doing it. With it, a long
           hold stays one row unless its own court set actually changes. */
        const prev = out.find(
          (e) =>
            e.date === date &&
            e.to === band.from &&
            keyOf.get(e) === key &&
            e.courts.length === band.courts.length &&
            e.courts.every((c, n) => c === band.courts[n]),
        );
        if (prev) prev.to = band.to;
        else { out.push(band); keyOf.set(band, key); }
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.from - b.from);
}

/* "" for today, "Tomorrow", else a short weekday. Built from the date STRING's
   own parts rather than by parsing it — new Date("2026-10-09") is UTC
   midnight, which formats as the 8th in New York and would label every future
   booking a day early. */
export function dayLabel(date: string, today: string): string {
  const diff = dayDiff(date, today);
  if (diff <= 0) return "";
  if (diff === 1) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  const at = new Date(y, m - 1, d);
  /* ⚠️ A WEEKDAY IS ONLY UNAMBIGUOUS INSIDE A WEEK. The list runs 21 days now
     that it shows ten, and "Mon" for something sixteen days out is worse than
     useless — somebody reads it as the Monday coming. Past six days ahead it
     becomes a date. */
  if (diff <= 6) return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(at);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(at);
}

/* Whole days between two club-local YYYY-MM-DD strings. Date.UTC on the parts,
   so neither DST nor the viewer's zone can shift the answer by one. */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
}

/* ONE BOX PER COURT, an X where it is taken (2026-10-14).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "maybe have 3 boxes for badminton, and put a x in them for occupied
   and nothing in them for open... same for cricket and squash". They replace
   "Courts 1, 2, 3" on the board: from the desk the PATTERN says which courts,
   where a list had to be read — and three boxes are narrower than "Courts 1, 2,
   3", which gives the holder back the width the session word takes. The boxes
   run in court order; the numbers over the COMING UP column say which is which.

   Sizes in vw like everything else here. An empty box is drawn at 0.55 white —
   deliberately quieter than a taken one, because a free court is the absence of
   something — and a taken one is near-opaque with a white X, because anything
   under about 0.75 alpha reads grey from the desk. The words survive as the
   aria-label (courtsLabel below). */
export function CourtBoxes({
  sport, labels, taken, big, alarm = [],
}: { sport: string; labels: string[]; taken: string[]; big?: boolean; alarm?: string[] }) {
  const on = new Set(taken);
  /* The courts another party is waiting for, while OFF COURT counts down (2026-10-25):
     edged and washed in OFF_COURT, so a group on court 2 of three can tell from the
     court that the line is about them. */
  const hot = new Set(alarm);
  const size = big ? "calc(2.1 * var(--vw))" : "calc(1.02 * var(--vw))";
  return (
    <span
      role="img"
      aria-label={courtsLabel(sport, taken)}
      style={{ display: "inline-flex", alignItems: "center", gap: big ? "calc(0.5 * var(--vw))" : "calc(0.26 * var(--vw))" }}
    >
      {labels.map((l) => {
        const isOn = on.has(l);
        const isHot = isOn && hot.has(l);
        return (
          <span
            key={l}
            style={{
              width: size, height: size, flex: "none", boxSizing: "border-box",
              borderRadius: big ? "calc(0.22 * var(--vw))" : "calc(0.14 * var(--vw))",
              border: `${big ? "calc(0.18 * var(--vw))" : "calc(0.12 * var(--vw))"} solid ${isHot ? OFF_COURT : isOn ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)"}`,
              background: isHot ? `${OFF_COURT}40` : isOn ? "rgba(255,255,255,0.10)" : "transparent",
              display: "inline-flex",
            }}
          >
            {isOn && (
              <svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden>
                <path d="M1.4 1.4 L8.6 8.6 M8.6 1.4 L1.4 8.6" stroke={INK} strokeWidth={big ? 1.3 : 1.8} strokeLinecap="round" />
              </svg>
            )}
          </span>
        );
      })}
    </span>
  );
}

/* The court numbers over the COMING UP boxes, at the boxes' own pitch. */
function CourtNumbers({ labels }: { labels: string[] }) {
  return (
    <span style={{ display: "inline-flex", gap: "calc(0.26 * var(--vw))" }}>
      {labels.map((l) => (
        <span key={l} style={{ width: "calc(1.02 * var(--vw))", textAlign: "center", fontSize: "calc(0.82 * var(--vw))", letterSpacing: 0 }}>{l}</span>
      ))}
    </span>
  );
}

/* A partner's session (PBA, CCCA, SquashTigers) beside its lockup while it is on
   court: JUNIOR COACHING filled in the brand orange, OPEN PLAY outlined in white.
   In the lockup row, never a new line — the NOW area has no spare height. Three
   live entries fit only because the boxes go compact at three (see the NOW list),
   and the panels' grid row is minmax(0, 1fr), so a fourth clips inside NOW
   instead of pushing every panel off the bottom of the screen.

   Only Girls – Free Coaching (2026-10-15) is filled gold and set in its own case:
   textTransform 'none' undoes .text-cond, because the owner asked for those exact
   words, and the tracking comes down to 0.03em because 0.08em suits capitals but
   spaces lower case apart. It is also set SMALLER, 1.1vw against 1.25vw: renamed
   from "FREE Girls-Only Class" the same day, the label grew from 21 characters to
   26, and measured in Oswald at the board's width it came to 266px at 1.25vw
   against roughly 260px free beside the CCCA lockup in a panel a third of the
   screen wide. 1.1vw is 237px. If the words change again, measure before shipping. */
export function SessionTag({ session }: { session: SessionKey }) {
  const junior = session === "junior-coaching";
  const free = session === "free-girls-class";
  const filled = junior || free;
  return (
    <span
      className="text-cond"
      style={{
        fontSize: free ? "calc(1.1 * var(--vw))" : "calc(1.25 * var(--vw))", letterSpacing: free ? "0.03em" : "0.08em", lineHeight: 1, whiteSpace: "nowrap",
        padding: "calc(0.32 * var(--vw)) calc(0.62 * var(--vw))", borderRadius: "calc(0.3 * var(--vw))",
        background: junior ? SESSION_ORANGE : free ? SESSION_GOLD : "transparent",
        color: filled ? BG : INK,
        border: filled ? "none" : `calc(0.15 * var(--vw)) solid ${INK}`,
        ...(free ? { textTransform: "none" as const } : {}),
      }}
    >
      {SESSION_TEXT[session]}
    </span>
  );
}

/* The session word's colour in a COMING UP row, where there is no room for a tag. */
export function sessionInk(session: SessionKey): string {
  if (session === "junior-coaching") return SESSION_ORANGE;
  if (session === "free-girls-class") return SESSION_GOLD;
  return INK;
}

/* "1","2","3" -> "Courts 1, 2, 3". EVERY COURT IS NAMED; there is no range.
   (2026-10-14: no longer drawn — the boxes above replaced it on the board — but
   kept as their aria-label, and for the reasoning below.)
   ──────────────────────────────────────────────────────────────────────────
   This collapsed consecutive numbers into "Courts 1–3" until 8 Oct 2026, when
   Aniket asked for each one spelled out. The reason is worth keeping: on a
   board a range invites the reader to work out which courts it covers, and
   "1–3" and "1, 3" differ by one character while meaning two and three courts
   respectively. Naming them removes the arithmetic and the near-miss.

   It costs width — "Courts 1, 2, 3" is five characters longer than
   "Courts 1–3" — which the COMING UP rows absorb because the court column is
   pinned at its natural width and the HOLDER is what truncates. If a club
   ever has enough courts for this to overflow, shorten the noun, not this. */
function courtsLabel(sport: string, labels: string[]): string {
  const noun = sport === "Cricket" ? "Lane" : "Court";
  if (labels.length === 1) return `${noun} ${labels[0]}`;
  return `${noun}s ${labels.join(", ")}`;
}

/* The clock and the date line moved to components/ScreenChrome with the header
   (2026-10-20), shared with /exit. */

export function Lockup({ brand, who }: { brand: BrandKey | null; who: string }) {
  if (brand === "philadelphia-badminton") {
    return (
      <div
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.02,
          fontSize: "calc(1.55 * var(--vw))",
        }}
      >
        <span style={{ display: "block", color: EMBER }}>Philadelphia</span>
        <span style={{ display: "block", color: INK }}>Badminton</span>
      </div>
    );
  }
  if (brand === "ccca") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "calc(0.6 * var(--vw))" }}>
        <Image
          src="/academies/ccca-shield.png"
          alt=""
          width={360}
          height={239}
          style={{ height: "calc(3.1 * var(--vw))", width: "auto" }}
        />
        <div className="text-cond" style={{ fontSize: "calc(1.15 * var(--vw))", lineHeight: 1.08, letterSpacing: "0.04em" }}>
          <span style={{ display: "block", color: EMBER }}>Chester County</span>
          <span style={{ display: "block", color: INK }}>Cricket Academy</span>
        </div>
      </div>
    );
  }
  if (brand === "squashtigers") {
    /* Type, not a mark: SQUASHTIGERS is a registered trademark but the artwork
       is not in this repo or any sibling (checked 2026-10-07). Swap this for
       the real logo the moment the file exists — the brand key already routes
       here, so it is a one-component change. */
    return (
      <div
        className="text-cond"
        style={{ fontSize: "calc(1.6 * var(--vw))", letterSpacing: "0.08em", color: INK, lineHeight: 1.05 }}
      >
        SQUASH<span style={{ color: EMBER }}>TIGERS</span>
      </div>
    );
  }
  if (brand === "sera") {
    /* The studio's own split: script name, caps descriptor — the same lockup
       the homepage partner strip draws, in the board's palette. The flyer
       artwork is a portrait raster with a photograph in it and would not
       survive being dropped into a dark panel. */
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: "calc(0.5 * var(--vw))" }}>
        <span
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 700, fontSize: "calc(2 * var(--vw))", lineHeight: 1, color: EMBER,
          }}
        >
          SeRa
        </span>
        <span
          className="text-cond"
          style={{ fontSize: "calc(1.05 * var(--vw))", letterSpacing: "0.18em", color: INK, whiteSpace: "nowrap" }}
        >
          DANCE &amp; FITNESS
        </span>
      </div>
    );
  }
  if (brand === "throwball") {
    /* Phoenix, Reshma's throwball team (2026-10-26, Aniket: "show it on the TV with
       their booking"). Built as CCCA's is: the crest at the shield's height, then the
       team in ember over the sport. Until today it fell through to the plain name
       below and read PHOENIX THROWBALL. Type at 1.4vw, not CCCA's 1.15: the words are
       shorter, and two lines of 1.4vw come to the crest's 3.1vw, so the lockup is no
       taller than CCCA's and fits wherever theirs does — the NOW area's three-entry
       arithmetic in BigEntry assumes partner lockups of about that height.
       The crest is the team's JPEG with the white cut out. Its black outline is lost on
       this navy, but the flames carry the shape; checked against BG before shipping. */
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "calc(0.6 * var(--vw))" }}>
        <Image
          src="/partners/phoenix-256.webp"
          alt=""
          width={256}
          height={256}
          style={{ height: "calc(3.1 * var(--vw))", width: "auto" }}
        />
        <div className="text-cond" style={{ fontSize: "calc(1.4 * var(--vw))", lineHeight: 1.08, letterSpacing: "0.05em" }}>
          <span style={{ display: "block", color: EMBER }}>Phoenix</span>
          <span style={{ display: "block", color: INK }}>Throwball</span>
        </div>
      </div>
    );
  }
  /* Not a partner — somebody's own hire. On reception that is their name; on
     the vestibule the feed carries no name and holderLabel has already made it
     "PRIVATE" (board-lib, 2026-10-09). Printing `who` either way keeps one
     source of truth for the wording; only the weight differs, because PRIVATE
     is a placeholder and a name is a fact. */
  const isPrivate = who === "PRIVATE";
  return (
    <div
      className="text-cond"
      style={{
        fontSize: "calc(1.5 * var(--vw))",
        color: isPrivate ? MUTED : INK,
        letterSpacing: isPrivate ? "0.06em" : "0.03em",
        lineHeight: 1.1,
      }}
    >
      {who}
    </div>
  );
}

/* One booking, big — what the NOW area draws for a live entry and, since
   2026-10-16, for an UP NEXT one. Same drawing for both on purpose: the line above
   them, ON NOW or UP NEXT, is what says which. */
function BigEntry({
  e, sport, labels, big, last,
}: { e: Entry; sport: string; labels: string[]; big: boolean; last: boolean }) {
  /* No margin under the last one: in a centred column it only added height,
     and the ON NOW / UP NEXT line above now spends it (2026-10-16).

     COMPACT AT THREE, NOT ONLY THE BOXES (2026-10-26). Three entries ran 49px past
     the NOW area at 1080p, measured on production with COMING UP full (its ten rows
     are what a real evening has; the 2026-10-14 measurement had fewer): 477px of
     entries in 428. The top of the panel — the ON NOW line — was what got cut,
     because the column is centred. Rare until the OFF COURT countdown's TIME UP
     began holding the group that is due off beside the one coming on, for five
     minutes. So at three or more (`big` false) the lockup row loses its 3.2vw
     floor — 1.9vw still clears a session tag — the time drops to 2.6vw, and the gap
     between entries to 0.7vh: 152px an entry becomes ~118 for a private hire,
     measured, and three fit. A partner's two-line lockup keeps its own height. */
  return (
    <div style={{ marginBottom: last ? 0 : big ? "calc(1.2 * var(--vh))" : "calc(0.7 * var(--vh))" }}>
      <div style={{ minHeight: big ? "calc(3.2 * var(--vw))" : "calc(1.9 * var(--vw))", display: "flex", alignItems: "center", gap: "calc(0.8 * var(--vw))", marginBottom: "calc(0.4 * var(--vh))" }}>
        <Lockup brand={e.brand} who={e.who} />
        {e.session && <SessionTag session={e.session} />}
      </div>
      {e.nudge ? (
        <NudgedFoot e={e} nudge={e.nudge} sport={sport} labels={labels} big={big} />
      ) : (
        <EntryFoot e={e} sport={sport} labels={labels} big={big} face={{ kind: "none" }} />
      )}
    </div>
  );
}

/* An entry that is counting down, re-drawn every second — on the header clock's own
   ticker, so the two change on the same frame. Only this re-renders each second; the
   board's grouping stays on its quarter-minute tick. Before the first tick (the server
   render) it draws exactly what an ordinary entry draws. */
function NudgedFoot({
  e, nudge, sport, labels, big,
}: { e: Entry; nudge: EntryNudge; sport: string; labels: string[]; big: boolean }) {
  const ms = useTick(secondTicker);
  const face: NudgeFace = ms ? nudgeFace(nudge.kind, nudge.endMs - ms) : { kind: "none" };
  return <EntryFoot e={e} sport={sport} labels={labels} big={big} face={face} nudge={nudge} />;
}

/* The time line and the court boxes under a big entry. With no countdown showing they
   are what they always were. With one, the TIME is what gives way — never the holder,
   which stays whatever the screen's key allows — at the same 3.1vw, so the NOW area
   (single pixels to spare with three groups on court) does not grow by a pixel; and
   the line beside the boxes says what follows, in the room the boxes leave free.

     OFF COURT IN 7 MIN   then   OFF COURT IN 2:59   then   [TIME UP]
                          NEXT GROUP AT 7 PM (with COURT 2 · first, when only some
                          of the entry's courts have someone waiting)
     ENDS IN 7 MIN        FREE AFTER · EXTEND IN THE APP, ember, no seconds

   The seconds are tabular so the line does not shuffle sideways every second. */
function EntryFoot({
  e, sport, labels, big, face, nudge,
}: { e: Entry; sport: string; labels: string[]; big: boolean; face: NudgeFace; nudge?: EntryNudge }) {
  const noun = sport === "Cricket" ? "LANE" : "COURT";
  const showing = face.kind !== "none" ? nudge : undefined;
  /* Only some of this entry's courts? Then say which, beside the boxes. */
  const which = nudge && nudge.courts.length < e.courts.length
    ? `${noun}${nudge.courts.length > 1 ? "S" : ""} ${nudge.courts.join(", ")}` : "";
  let line: ReactNode = span(e.from, e.to);
  let ink = INK;
  let note = "";
  if (showing) {
    switch (face.kind) {
      case "offIn":
        line = `OFF ${noun} IN ${face.min} MIN`; ink = OFF_COURT; break;
      case "offSec":
        line = <>OFF {noun} IN <span style={{ fontVariantNumeric: "tabular-nums" }}>{face.clock}</span></>; ink = OFF_COURT; break;
      case "timeUp":
        line = (
          /* inline-block at the line's own height: an inline span's background is the
             font's whole ascent-to-descent, taller than this 1.03 line, and on the
             mock-up it ran up over the holder's name and down over the boxes. */
          <span style={{ display: "inline-block", lineHeight: "inherit", background: OFF_COURT, color: BG, borderRadius: "calc(0.3 * var(--vw))", padding: "0 calc(0.6 * var(--vw))" }}>
            TIME UP
          </span>
        );
        break;
      case "endsIn":
        line = `ENDS IN ${face.min} MIN`; ink = EMBER; break;
    }
    note = showing.kind === "next"
      ? `${which ? `${which} · ` : ""}NEXT GROUP AT ${clock(showing.nextAt ?? 0)}`
      : `${which ? `${which} ` : ""}FREE AFTER · EXTEND IN THE APP`;
  }
  const alarm = showing?.kind === "next" ? showing.courts : [];
  return (
    <>
      <div className="text-cond" style={{ fontSize: big ? "calc(3.1 * var(--vw))" : "calc(2.6 * var(--vw))", color: ink, lineHeight: 1.03, whiteSpace: "nowrap" }}>
        {line}
      </div>
      {/* display:flex so the row has no inherited 16px/1.5 line box under it. */}
      <div style={{ display: "flex", alignItems: "center", gap: "calc(0.8 * var(--vw))", marginTop: "calc(0.5 * var(--vh))", minWidth: 0 }}>
        <CourtBoxes sport={sport} labels={labels} taken={e.courts} big={big} alarm={alarm} />
        {note && (
          <span
            className="text-cond"
            style={{
              fontSize: big ? "calc(1.2 * var(--vw))" : "calc(0.95 * var(--vw))", letterSpacing: "0.06em", lineHeight: 1.05,
              color: showing?.kind === "next" ? INK : EMBER, minWidth: 0,
            }}
          >
            {note}
          </span>
        )}
      </div>
    </>
  );
}

/* "ON NOW" over what is on court, "UP NEXT" over what is not on yet (2026-10-16,
   Aniket: "change up next to on now when the timing of the event matches the
   current time") — and for UP NEXT the day when it is not today, "UP NEXT ·
   TOMORROW". One style for both, so the WORDS are the difference. The day
   goes here rather than in front of the big time, because "TOMORROW 5:30 – 6:30 PM"
   at the time's 3.1vw is ~607px against ~548px of panel at 1080p (measured
   2026-10-16). In the header's orange, not
   GREEN: green on this board means a court is free, and this line is about a
   booking. */
function SlotLine({ text, day }: { text: "ON NOW" | "UP NEXT"; day: string }) {
  return (
    <div
      className="text-cond"
      style={{ fontSize: "calc(1.45 * var(--vw))", letterSpacing: "0.12em", color: EMBER, lineHeight: 1, marginBottom: "calc(1.4 * var(--vh))" }}
    >
      {text}
      {day && <span style={{ color: INK }}> · {day}</span>}
    </div>
  );
}

/* THE LIGHTS CHIP — the drawing only; WHICH state is lightChip's decision, in
   board-lib, with the reasoning.

   2026-10-18, the look Aniket approved in the mock-up ("yes on the light chip"): a
   pale lamp yellow #FFE6A6 for LIGHTS ON, the brand orange for the countdown, LABEL
   white for LIGHTS ON IN, and LIGHTS OFF at 0.55 white — at 0.6em of the title, in
   Oswald 400, on a faint tinted pill.

   2026-10-20, BRIGHTER, AND YELLOW WHILE THE LIGHTS ARE ON. Aniket, watching the TVs
   with the lights forced on: "chips are showing but maybe make those brighter, make
   the font bright yellow when lights are on"; and again: "make the light chips
   brighter with yellow font". Now:

     on      lit yellow bulb, yellow ring and halo   LIGHTS ON             yellow
     offIn   lit ORANGE bulb, double orange ring     LIGHTS OFF IN 8 MIN   yellow
             and halo
     onIn    white outline bulb, white ring          LIGHTS ON IN 12 MIN   white
     off     dim outline bulb, faint ring            LIGHTS OFF            0.78 white

   · THE YELLOW is LIGHT_YELLOW, a lemon, picked by measurement against SESSION_GOLD
     on the same board: 53.6° against 41.8° in hue (11.9° apart), ΔE2000 13.0, and
     lighter — far enough that the chip never reads as the girls' tag.
   · LIGHTS OFF IN n MIN is the lights still ON, so its words are yellow too, as he
     asked. The warning stays in SESSION_ORANGE — the bulb, its glow, the ring and the
     halo — because that state matters to a group still on court, and from across the
     room the orange lamp is what says "about to go off" before the words are read.
     The orange outline is DOUBLED, 0.2em: the 0.1em border plus a 0.1em spread in the
     halo. The 2px border alone is ~0.7 arcminute on the 55" from 6 m, under what the
     eye resolves, so with yellow words the countdown read nearly as LIGHTS ON from
     across the room (review, 2026-10-20). A box-shadow, so the layout does not move.
   · THE PILL IS DARK, NOT A LIGHTER TINT. The panel is at its lightest behind the
     title, and measured there this yellow gets only ~6:1 and even pure white ~7.4:1.
     So the fill is the board's own ground at 0.8 (CHIP_FILL; 0.4 for LIGHTS OFF), and
     the brightness went into the text, the ring, the bulb and a halo. Measured at
     1080p on the lightest ground under any chip, text on the fill (WCAG): ON 13.0:1,
     OFF IN 13.0:1, ON IN 15.9:1, OFF 7.6:1 — against 5.1, 2.8, 5.4 and 3.3 before.
   · 0.7em of the title (from 0.6), Oswald 600 (from 400), tracking 0.08em (from 0.1),
     ring 0.1em (from 0.08). The widest label, "LIGHTS OFF IN 10 MIN", still clears
     the shuttle beside BADMINTON by 42px at 1080p and 7px on a 390px phone — every
     label from 1 to 30 MIN was measured, one line each. The bulb comes down to 1.2em
     and the vertical padding to 0.24em so the pill is no taller than the approved
     one (37.8px against 38.4 at 1080p), and the NOW list below keeps its clearance.
   · LIGHTS OFF stays the resting state — dimmer than the other three in text, ring
     and bulb — but at 0.78 white, over the 0.75 this file keeps text above, so it
     reads from the desk rather than as grey.

   ⛔ NEVER GREEN — on this board green means a court is free, and a green LIGHTS ON
   would read as "court open" from the desk — and never SESSION_GOLD, the girls' tag.
   The halo is a box-shadow and the bulb's glow a drop-shadow, both STATIC: nothing on
   the chip animates.

   In em of the title it sits in (calc(1.5 * var(--vw)), 1.5% of the 16:9 box, not of
   the window), like the sport's object, so it stays locked
   to the title at any screen shape. Literal colours, as everywhere on this board. */
const LIGHT_YELLOW = "#FFEA3A";
/** BG #0B1623 at 0.8 — the pill's fill while the lights are on or about to be; see
 *  THE PILL IS DARK above. LIGHTS OFF takes it at 0.4 (CHIP_FILL_REST), so the resting
 *  chip sits back into the panel instead of standing out as a dark slot. */
const CHIP_FILL = "#0B1623CC";
const CHIP_FILL_REST = "#0B162366";

type ChipLook = {
  /** A lit bulb (filled, rays, glow) or an outline. */
  lit: boolean;
  /** The bulb, its glow when lit, and nothing else. A 6-digit hex when lit — the
   *  glow appends its own alpha. */
  bulb: string;
  /** The words. */
  ink: string;
  /** The pill's fill. */
  fill: string;
  /** The pill's border. */
  ring: string;
  /** The pill's box-shadow. */
  halo: string;
};
const CHIP_LOOK: Record<LightChip["kind"], ChipLook> = {
  on: { lit: true, bulb: LIGHT_YELLOW, ink: LIGHT_YELLOW, fill: CHIP_FILL, ring: LIGHT_YELLOW, halo: `0 0 0.5em ${LIGHT_YELLOW}73` },
  offIn: {
    lit: true, bulb: SESSION_ORANGE, ink: LIGHT_YELLOW, fill: CHIP_FILL, ring: SESSION_ORANGE,
    halo: `0 0 0 0.1em ${SESSION_ORANGE}, 0 0 0.6em ${SESSION_ORANGE}99`,
  },
  onIn: { lit: false, bulb: "#FFFFFF", ink: "#FFFFFF", fill: CHIP_FILL, ring: "#FFFFFFD9", halo: "none" },
  off: { lit: false, bulb: "#FFFFFFB3", ink: "#FFFFFFC7", fill: CHIP_FILL_REST, ring: "#FFFFFF66", halo: "none" },
};

function lightText(c: LightChip): string {
  switch (c.kind) {
    case "on": return "LIGHTS ON";
    case "offIn": return `LIGHTS OFF IN ${c.min} MIN`;
    case "onIn": return `LIGHTS ON IN ${c.min} MIN`;
    case "off": return "LIGHTS OFF";
  }
}

/* A bulb in a 24-unit box: rays and a glow when lit, an outline when not. The rays
   are drawn past the viewBox (overflow visible) so the bulb itself keeps the full
   height of the chip's line. */
function Bulb({ lit, color }: { lit: boolean; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      style={{
        height: "1.2em", width: "1.2em", display: "block", overflow: "visible",
        filter: lit ? `drop-shadow(0 0 0.28em ${color}) drop-shadow(0 0 0.7em ${color}88)` : "none",
      }}
    >
      {lit && (
        <g stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
          <line x1="12" y1="-1.6" x2="12" y2="0.4" />
          <line x1="3.2" y1="2.4" x2="4.6" y2="3.8" />
          <line x1="20.8" y1="2.4" x2="19.4" y2="3.8" />
          <line x1="-0.6" y1="9.5" x2="1.4" y2="9.5" />
          <line x1="24.6" y1="9.5" x2="22.6" y2="9.5" />
        </g>
      )}
      <path
        d="M12 2.6a6.7 6.7 0 0 0-4 12.1c.6.45.95 1.1.95 1.85V17.6h6.1v-1.05c0-.75.35-1.4.95-1.85A6.7 6.7 0 0 0 12 2.6z"
        fill={lit ? color : "none"} stroke={color} strokeWidth="1.5" strokeLinejoin="round"
      />
      {lit && (
        <path d="M10 13.2l1-2.4 1 1.6 1-1.6 1 2.4" fill="none" stroke="#7A4B12" strokeWidth="0.9" strokeLinejoin="round" opacity="0.55" />
      )}
      <line x1="9.2" y1="19.6" x2="14.8" y2="19.6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.2" y1="21.9" x2="13.8" y2="21.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LightStatus({ chip }: { chip: LightChip }) {
  const look = CHIP_LOOK[chip.kind];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.45em", whiteSpace: "nowrap",
        fontSize: "0.7em", fontWeight: 600, letterSpacing: "0.08em", lineHeight: 1, color: look.ink,
        padding: "0.24em 0.75em 0.24em 0.55em", borderRadius: "999px",
        background: look.fill, border: `0.1em solid ${look.ring}`, boxShadow: look.halo,
      }}
    >
      <Bulb lit={look.lit} color={look.bulb} />
      {lightText(chip)}
    </span>
  );
}

/** How long the last `lights` outlives responses that come without it — see load(). */
const LIGHTS_CARRY_MS = 3 * 60_000;

/* THE FEED AND THE GROUPING, as a hook (2026-10-21) — moved out of the component
   below unchanged when the vestibule got a layout of its own (app/vestibule/
   VestibuleScreen.tsx: the bookings fixed down the left, the promotions on the
   right). Both screens draw from this one copy, so the merging rules above, the
   stale handling and the lights carry cannot drift between two TVs twenty feet
   apart. `upcoming` and `upNextMax` are the only things the two layouts choose
   differently: how many rows each panel lists, and how many simultaneous starts
   go up into the big area.

   `currentOnly` (the vestibule, 2026-10-21): ON NOW is only the band that
   contains this minute. mergeBlocks slices a holder's hours wherever their set of
   courts changes, so CCCA holding lanes 1-2 from 5pm and all three from 6pm
   arrives as "5 – 6 PM" and "6 – 8 PM" — and at 7:19pm reception still lists the
   first under ON NOW. Seen on the vestibule mock-up that day; reception is left
   as it is, unasked.

   ⚠️ THE OTHER END OF THE SAME RUN MUST NOT VANISH (review, the same evening).
   The first cut only dropped bands that did not contain this minute — and a band
   that starts LATER belongs to a block that is live now, so it was not in
   `ahead` either and showed nowhere: PBA on badminton 1 from 4 to 7pm and on 2-3
   from 4 to 6pm read, at 4:30, "4 – 6 PM" and then tomorrow, as if court 1 were
   free from 6. So under currentOnly the live and the coming blocks are merged
   TOGETHER, and each band is sorted by where it sits against this minute: over
   (dropped), on now, or to come (the NEXT line's list).

   The reload-on-deploy hook and the heartbeat are NOT in here: a screen calls
   useReloadOnDeploy itself, and the heartbeat is TvScreen's (see below). */
/* `nudges` (reception, 2026-10-25): the OFF COURT countdown — see courtNudges in
   board-lib for the rules and EntryFoot for the drawing. It also does two things to
   the entries, both needed for the countdown to tell the truth:
     · every block takes its TRUE start and end (exactFrom / exactTo) where the feed
       sent them, so Sunday's throwball reads 6:15 – 7:45 PM and leaves ON NOW at
       7:45, the moment its countdown runs out, not at 8;
     · a booking another party is waiting on STAYS under ON NOW through its TIME UP
       hold, beside the group that is now due on, instead of vanishing at its end.
   The vestibule does not pass it and is unchanged. */
export function useCourtPanels({ upcoming, upNextMax, currentOnly = false, nudges = false }: { upcoming: number; upNextMax: number; currentOnly?: boolean; nudges?: boolean }): {
  panels: Panel[]; today: string; stale: boolean;
} {
  const [data, setData] = useState<NamedSlots | null>(null);
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);
  /** The last `lights` a response carried, and when (this TV's clock). */
  const lastLights = useRef<{ at: number; lights: Lights } | null>(null);

  /* Fifteen seconds, NOT one: this decides which hour counts as "now" and so
     re-runs the grouping below. A row flipping up to a quarter minute late is
     the one error somebody standing at the desk would notice; re-grouping
     sixty times a minute for weeks is not worth removing it. The visible
     seconds come from <Clock/> (components/ScreenChrome), which re-renders a single span. */
  const tick = useTick(quarterMinuteTicker);

  useEffect(() => {
    mounted.current = true;
    const key = readKey();
    /* Unkeyed, the page asks the relay for the lights too (?lights=1, 2026-10-18,
       Aniket: "Add there too"). The schedule only at first, with the bridge's report
       and any override behind a TV's key; since 2026-10-21 the live state as well
       ("show the real on/off state on the public page too"), so a laptop and the TVs
       give the same chip. What the relay forwards: lib/public-lights.ts. */
    const url = key ? `${PLATFORM}/api/public/court-board?days=21` : "/api/court-slots?lights=1";
    const init: RequestInit = key
      ? { cache: "no-store", headers: { Authorization: `Bearer ${key}` } }
      : { cache: "no-store" };

    const load = async () => {
      try {
        const res = await fetch(url, init);
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as NamedSlots;
        if (!mounted.current) return;
        /* An empty payload is what the proxy returns when the platform is
           unreachable. Treat it as a failed poll, not as "every court is
           free" — the second reading would have a lobby screen inviting
           people onto a court somebody has booked. */
        if (!body.courts?.length) { setStale(true); return; }
        /* Carry `lights` across a response that lacks it, for up to
           LIGHTS_CARRY_MS since the last one that had it (2026-10-18 review).
           The platform leaves `lights` out on ANY failure reading it, its 3 s
           budget included, while the rest of the payload is fine — so one slow
           read made the chip, which is meant to be always there for an
           automated sport, vanish for a whole 60 s poll. Not forever: past three
           minutes it is a real outage, or auto_lights was switched off for the
           club, and a chip for lights nobody switches is the worse lie. Carried
           windows are still judged against the live tick, and the carried
           report ages out on its own inside lightChip, leaving the calendar. */
        const at = Date.now();
        let next = body;
        if (body.lights) lastLights.current = { at, lights: body.lights };
        else if (lastLights.current && at - lastLights.current.at <= LIGHTS_CARRY_MS) {
          next = { ...body, lights: lastLights.current.lights };
        } else lastLights.current = null;
        setData(next);
        setStale(false);
      } catch {
        if (mounted.current) setStale(true);
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { mounted.current = false; clearInterval(t); };
  }, []);

  const view = useMemo((): { panels: Panel[]; today: string } => {
    /* `tick` is 0 until the ticker subscribes on mount, which is also what the
       server rendered — so the first pass draws an empty shell and the data
       arrives on the next tick. Depending on the NUMBER rather than on a Date
       object is what keeps this memo from re-running every render. */
    if (!data || !tick) return { panels: [], today: "" };
    const { date: today, minutes } = clubNow(new Date(tick));
    /** Now with its seconds, as a fraction of a minute — for the countdown's window. */
    const nowMin = minutes + (((tick % 60_000) + 60_000) % 60_000) / 60_000;

    const sports = Array.from(new Set(data.courts.map((c) => c.sport)));
    sports.sort((a, b) => {
      const ia = SPORT_ORDER.indexOf(a), ib = SPORT_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    const panels = sports.map((sport) => {
      const courts = data.courts.filter((c) => c.sport === sport);
      const ids = new Set(courts.map((c) => c.id));
      const label = new Map(courts.map((c) => [c.id, c.label || c.name]));
      const raw = data.blocks.filter((b) => ids.has(b.courtId));
      const mine = nudges
        ? raw.map((b) => (b.exactFrom === undefined && b.exactTo === undefined ? b : { ...b, from: startOf(b), to: endOf(b) }))
        : raw;
      const nudging = nudges ? courtNudges(mine, today, nowMin) : [];
      /* Ended, but another party is waiting: held under ON NOW for its TIME UP. */
      const holding = nudging.filter((n) => n.kind === "next" && n.end <= minutes).map((n) => n.block);

      const live = [
        ...mine.filter((b) => b.date === today && b.from <= minutes && minutes < b.to),
        ...holding,
      ];

      /* Everything still to come: later today, then whole days after it.
         Merged with the SAME function as the live list so a booking that
         spans three courts is one line in both places — otherwise PBA would
         collapse while it is on and then fan back out to three rows the
         moment it became "upcoming". */
      const ahead = mine.filter(
        (b) => (b.date === today && b.from > minutes) || b.date > today,
      );

      let nowEntries: Entry[];
      let aheadEntries: Entry[];
      if (currentOnly) {
        const all = mergeBlocks([...live, ...ahead], label);
        nowEntries = all.filter((e) => e.date === today && e.from <= minutes && minutes < e.to);
        aheadEntries = all.filter((e) => (e.date === today && e.from > minutes) || e.date > today);
      } else {
        nowEntries = mergeBlocks(live, label);
        aheadEntries = mergeBlocks(ahead, label);
      }
      /* Each nudge onto the entry that holds its court and ends when its block ends —
         by holder and session too, so it never lands on somebody else's row. An entry
         over several courts takes "next" if ANY of them has someone waiting, and says
         which (EntryFoot), because that is the one that hurts. */
      for (const e of nudging.length ? nowEntries : []) {
        const hits = nudging.filter(
          (n) =>
            e.date === today && e.to === n.end &&
            e.courts.includes(label.get(n.courtId) ?? "") &&
            e.who === holderLabel(n.block) && e.session === sessionOf(n.block),
        );
        if (!hits.length) continue;
        const next = hits.filter((n) => n.kind === "next");
        const use = next.length ? next : hits;
        e.nudge = {
          kind: next.length ? "next" : "free",
          endMs: clubInstant(e.to, tick),
          ...(next.length ? { nextAt: Math.min(...next.map((n) => n.nextAt ?? Infinity)) } : {}),
          courts: [...new Set(use.map((n) => label.get(n.courtId) ?? ""))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
        };
      }
      const { upNext, rest } = splitUpNext(nowEntries, aheadEntries, upNextMax);

      return {
        sport,
        labels: [...new Set(courts.map((c) => label.get(c.id) ?? ""))]
          .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
        now: nowEntries,
        upNext,
        upcoming: rest.slice(0, upcoming),
        /* On the same 15 s tick as everything else here (2026-10-18): the minutes
           in LIGHTS OFF IN n MIN are rounded up, so at worst one reads a quarter
           minute high — and the windows run 24 h ahead, so a failed poll keeps
           the count honest from the last good payload. */
        light: lightChip(sport, data.lights, tick),
      };
    });

    return { panels, today };
  }, [data, tick, upcoming, upNextMax, currentOnly, nudges]);

  return { ...view, stale };
}

/* ONE SPORT'S BOX, in parts (2026-10-28), so the single-sport screens
   (SportBoard.tsx: the badminton and cricket TVs) can lay out the same title, NOW
   area and COMING UP list side by side. Moved here unchanged from the board below,
   which still stacks them in that order, so reception draws the same pixels. */
export const PANEL_BOX: CSSProperties = {
  display: "flex", flexDirection: "column", minWidth: 0,
  /* Two layers: the ember wash sits over the vertical shading, so
     the top of the box is warm and the foot falls away. PANEL
     stays underneath as the flat base for anything that cannot
     paint a gradient. */
  background: `${PANEL_GLOW}, ${PANEL_LIT}, ${PANEL}`,
  /* 0.09vw read as a hairline from the desk — roughly 1.7px on the
     55". 0.22vw is ~4px there and ~8px on the 75", which is the
     same line to the eye at both distances. */
  border: `calc(0.22 * var(--vw)) solid ${PANEL_BORDER}`,
  boxShadow: PANEL_SHADOW,
  borderRadius: "calc(0.6 * var(--vw))", padding: "calc(1.4 * var(--vh)) calc(1 * var(--vw))",
};

/* The title row: the sport, its object, and the lights chip. */
export function PanelTitle({ p }: { p: Panel }) {
  return (
    <div className="text-cond" style={{ position: "relative", fontSize: "calc(1.5 * var(--vw))", letterSpacing: "0.15em", color: LABEL, marginBottom: "calc(0.9 * var(--vh))" }}>
      <span style={{ position: "relative" }}>
        {p.sport.toUpperCase()}
        {SPORT_OBJECT[p.sport] && (
          /* A plain <img>: next/image serves an .svg unoptimised anyway,
             so here it would add nothing but required width/height props
             on an image sized in em. maxWidth none overrides the reset's
             100%, which here would mean 100% of the WORD and squash it. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={SPORT_OBJECT[p.sport]}
            alt=""
            aria-hidden
            style={{
              position: "absolute", left: "calc(100% + 0.6em)", top: "-0.015em",
              height: "1.575em", width: "auto", maxWidth: "none", pointerEvents: "none",
            }}
          />
        )}
      </span>
      {/* The lights chip (2026-10-18), RIGHT-JUSTIFIED flush with the box's
          inner right edge — where the court-number column ends below — as
          approved in the second mock-up. Absolute and centred on the title's
          line for the same reason the sport's object is: the chip is taller
          than the type, and in flow it would take its height from the NOW
          area, which has single pixels to spare when every court is busy. */}
      {p.light && (
        <span
          style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            lineHeight: 1, pointerEvents: "none",
          }}
        >
          <LightStatus chip={p.light} />
        </span>
      )}
    </div>
  );
}

/* Centred, not top-aligned. A panel holding one booking against a
   full-height column otherwise leaves a third of the screen blank
   above the NEXT line, which from across the lobby reads as a
   broken screen rather than a quiet one.
   SAFE centre (2026-10-26), as the vestibule's slot already is: when
   the entries outgrow the area (four squash groups at once), plain
   centring spilled them out of BOTH ends and the ON NOW line was the
   first thing cut. Safe, the overflow goes off the bottom only, and
   the earliest booking — the one in TIME UP — stays in view. */
export function NowArea({ p, today }: { p: Panel; today: string }) {
  return (
    <div
      style={{
        flex: 1, minHeight: 0, overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "safe center",
      }}
    >
      {/* ON NOW or UP NEXT, then the bookings (2026-10-16). The line
          that sat here, "N OF 3 FREE NOW", came off the same day —
          Aniket: "we don't need 3 of 3 free now - not neccessary.. just
          what's next, and what's upcoming" — and the label above the big
          entries took its height: "change up next to on now when the
          timing of the event matches the current time". Measured with
          three groups on court in every panel, the tightest case. */}
      {/* Compact boxes once three are on court — measured (review,
          2026-10-14): three entries with the big boxes ran past the NOW
          area; compact, they fit with room. UP NEXT shows at most two
          (UP_NEXT_MAX), so it always gets the big ones. */}
      {p.now.length > 0 ? (
        <>
          <SlotLine text="ON NOW" day="" />
          {p.now.map((e, n) => (
            <BigEntry
              key={`${e.who}-${e.session ?? ""}-${e.from}-${e.to}`}
              e={e} sport={p.sport} labels={p.labels} big={p.now.length < 3}
              last={n === p.now.length - 1}
            />
          ))}
        </>
      ) : p.upNext.length > 0 ? (
        <>
          <SlotLine text="UP NEXT" day={dayLabel(p.upNext[0].date, today)} />
          {p.upNext.map((e, n) => (
            <BigEntry
              key={`${e.date}-${e.who}-${e.session ?? ""}-${e.from}-${e.to}`}
              e={e} sport={p.sport} labels={p.labels} big
              last={n === p.upNext.length - 1}
            />
          ))}
        </>
      ) : (
        /* Only when nothing at all is booked ahead in the feed's window —
           since 2026-10-16 an idle sport shows its UP NEXT instead. */
        <div className="text-cond" style={{ fontSize: "calc(3.1 * var(--vw))", color: GREEN, lineHeight: 1.03 }}>
          ALL OPEN
        </div>
      )}
    </div>
  );
}

/* COMING UP — the next UPCOMING_COUNT, each with its court.
   ────────────────────────────────────────────────────────────
   Three columns on one line per booking: time, holder, court.
   A single wrapped line per booking would cost ten lines for
   five bookings and there is not room, so each row is clipped
   to one line and the HOLDER is the only part allowed to
   truncate. The time and the court are fixed-width at the two
   ends because they are what somebody at the desk is actually
   answering questions about ("who's got court 2 at eight?").

   The day prefix appears only when it is not today, so a list
   that stays inside today carries no repeated noise.

   Headed AFTER THAT, not COMING UP, while the big area is showing
   an UP NEXT (2026-10-16, Aniket's words for it) — the list then
   starts from the booking after that one, so neither is shown twice. */
export function ComingUp({ p, today, style }: { p: Panel; today: string; style?: CSSProperties }) {
  return (
    <div style={{ borderTop: `1px solid ${RULE_SOFT}`, paddingTop: "calc(0.6 * var(--vh))", ...style }}>
      <div
        className="text-cond"
        style={{
          display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: "0 calc(0.5 * var(--vw))",
          alignItems: "baseline", fontSize: "calc(1 * var(--vw))", letterSpacing: "0.16em", color: NEXT_LBL,
        }}
      >
        <span>{p.upNext.length ? "AFTER THAT" : "COMING UP"}</span>
        <span />
        <CourtNumbers labels={p.labels} />
      </div>
      {p.upcoming.length === 0 ? (
        <div className="text-cond" style={{ fontSize: "calc(1.2 * var(--vw))", color: NEXT_VAL, lineHeight: 1.35 }}>
          {p.upNext.length ? "Nothing else booked" : "Nothing booked"}
        </div>
      ) : (
        p.upcoming.map((e) => {
          const day = dayLabel(e.date, today);
          return (
            <div
              key={`${e.date}-${e.from}-${e.session ?? ""}-${e.who}`}
              className="text-cond"
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0,1fr) auto",
                gap: "0 calc(0.5 * var(--vw))", alignItems: "center",
                fontSize: "calc(1.12 * var(--vw))", lineHeight: 1.34, color: NEXT_VAL,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: INK }}>
                {day ? `${day} ` : ""}{span(e.from, e.to)}
              </span>
              {/* The session word FIRST and never truncated; the holder after
                  it is what gives way. Only partners carry a session —
                  PBA, CCCA and SquashTigers, one per column — so a cut-off
                  "CHESTER COUNTY CRICKET…" still says who it is. The free
                  girls' words keep their own case, as on the tag above. */}
              <span style={{ display: "flex", gap: "calc(0.45 * var(--vw))", minWidth: 0, overflow: "hidden" }}>
                {e.session && (
                  <span
                    style={{
                      flex: "none", color: sessionInk(e.session),
                      ...(e.session === "free-girls-class" ? { textTransform: "none" as const } : {}),
                    }}
                  >
                    {SESSION_TEXT[e.session]}
                  </span>
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{e.who}</span>
              </span>
              <CourtBoxes sport={p.sport} labels={p.labels} taken={e.courts} />
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ReceptionBoard() {
  useReloadOnDeploy();
  /* NO HEARTBEAT HERE, on purpose (2026-10-20). The alive-and-drawing beat goes in
     ONCE per page, outside the content: TvScreen.tsx for the TV routes, named by
     the TV's id (so /vestibule beats as "vestibule", not "reception"), whatever
     the TV shows. A hook in here as well would beat twice a minute under two
     names. The stamp in the band still shows on a keyed screen: it reads the
     same per-load runtime the heartbeat marks keyed (screen-runtime.ts). */
  /* nudges: the OFF COURT countdown (2026-10-25) — this is the TV players can see
     from the courts (Aniket, asked that day which screen faces them). */
  const { panels, today, stale } = useCourtPanels({ upcoming: UPCOMING_COUNT, upNextMax: UP_NEXT_MAX, nudges: true });

  /* 16:9, ALWAYS (2026-10-18): one 16:9 picture scaled to fit, letterboxed on the
     ground colour, with every size in --vw / --vh. BOX and why it exists are in
     components/tv-palette.ts since 2026-10-20, shared with /exit. */

  return (
    <div style={{ position: "absolute", inset: 0, background: BG }}>
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
      {/* The top strip — the club's mark and name, the date, the clock — shared
          with /exit since 2026-10-20: components/ScreenChrome. `stale` is the faint
          dot by the title that says the feed has failed. */}
      <ScreenHeader stale={stale} />

      {/* gridTemplateRows minmax(0, 1fr) (review, 2026-10-14): with the default
          `auto` row a panel grew to its content, so three live entries with the
          court boxes pushed all three panels — and their last COMING UP rows —
          off the bottom of the screen. Now the row is the screen's, and the NOW
          area's own overflow:hidden is what gives. */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(panels.length, 1)}, 1fr)`, gridTemplateRows: "minmax(0, 1fr)", gap: "calc(1.4 * var(--vw))", minHeight: 0 }}>
        {panels.map((p) => (
          <div key={p.sport} style={PANEL_BOX}>
            <PanelTitle p={p} />
            <NowArea p={p} today={today} />
            <ComingUp p={p} today={today} />
          </div>
        ))}
      </div>

      {/* The booking band — the same one /exit shows (components/ScreenChrome,
          2026-10-20), where it and its reasoning now live. The version stamp
          rides in its `stamp` slot, bottom right under the number, where it has
          been since the heartbeat went in (2026-10-20); its place is BAND_STAMP,
          shared with /exit. Keyed screens or ?diag only; nothing otherwise. */}
      <BookingBand stamp={<ScreenStamp style={BAND_STAMP} />} />
    </div>
    </div>
  );
}
