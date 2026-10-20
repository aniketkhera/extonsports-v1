"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeTicker, useTick } from "../components/ticker";
import Image from "next/image";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND } from "../components/ScreenChrome";
import { BG, INK, EMBER, GREEN, LABEL, NEXT_VAL, NEXT_LBL, MUTED, RULE_SOFT, PANEL, BOX } from "../components/tv-palette";
import {
  PLATFORM, readKey, clubNow, span, holderLabel, brandFor, sessionOf, splitUpNext, lightChip, SESSION_TEXT, SPORT_OBJECT,
  type BrandKey, type LightChip, type Lights, type NamedBlock, type NamedSlots, type SessionKey,
} from "../board/board-lib";

/* The clock is an external store, shared with /comingsoon — see
   app/components/ticker.ts for why it is not useState + useEffect. The visible
   seconds tick in components/ScreenChrome (the header, since 2026-10-20). */
/** Decides which hour counts as "now". Slower on purpose — see the board below. */
const quarterMinuteTicker = makeTicker(15_000);

/* The reception desk screen — the 55" M55Q6-L4 at 10.1.10.72.
   ──────────────────────────────────────────────────────────────────────────
   Built 2026-10-07 at Aniket's request, as a second layout over the same feed
   /board uses. The vestibule 75" keeps /board (one row per court, ten rows);
   this one groups by SPORT and carries the partner logos.

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
const PANEL_LIT =
  "linear-gradient(180deg, rgba(255,255,255,0.145) 0%, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.018) 100%)";
const PANEL_GLOW =
  "radial-gradient(120% 75% at 50% -12%, rgba(248,155,114,0.22) 0%, rgba(248,155,114,0) 72%)";
/* ⚠️ THE BORDER IS THE BRAND ORANGE AT FULL STRENGTH, not the pale header
   salmon at half opacity. The first attempt (2026-10-08) used EMBER #FFBE97 at
   0.52 and read as a warm grey line from the desk — "orange should be visible".
   #F89B72 is the same orange the website uses, and at full opacity it still
   belongs to the board rather than fighting the GREEN "ALL OPEN". */
const PANEL_BORDER = "#F89B72";
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
const PANEL_SHADOW = [
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
type Entry = {
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
};

type Panel = {
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
         alone the 7:30 split would be grouped straight back into one row. */
      const byWho = new Map<string, Entry>();
      for (const b of covering) {
        const who = holderLabel(b);
        const session = sessionOf(b);
        const key = `${session ?? ""}|${who}`;
        const found = byWho.get(key);
        if (found) found.courts.push(label.get(b.courtId) ?? "");
        else {
          byWho.set(key, {
            date, from, to, who, session,
            brand: brandFor(b), courts: [label.get(b.courtId) ?? ""],
          });
        }
      }

      for (const band of byWho.values()) {
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
            e.who === band.who &&
            e.session === band.session &&
            e.courts.length === band.courts.length &&
            e.courts.every((c, n) => c === band.courts[n]),
        );
        if (prev) prev.to = band.to;
        else out.push(band);
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.from - b.from);
}

/* "" for today, "Tomorrow", else a short weekday. Built from the date STRING's
   own parts rather than by parsing it — new Date("2026-10-09") is UTC
   midnight, which formats as the 8th in New York and would label every future
   booking a day early. */
function dayLabel(date: string, today: string): string {
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
function CourtBoxes({
  sport, labels, taken, big,
}: { sport: string; labels: string[]; taken: string[]; big?: boolean }) {
  const on = new Set(taken);
  const size = big ? "calc(2.1 * var(--vw))" : "calc(1.02 * var(--vw))";
  return (
    <span
      role="img"
      aria-label={courtsLabel(sport, taken)}
      style={{ display: "inline-flex", alignItems: "center", gap: big ? "calc(0.5 * var(--vw))" : "calc(0.26 * var(--vw))" }}
    >
      {labels.map((l) => {
        const isOn = on.has(l);
        return (
          <span
            key={l}
            style={{
              width: size, height: size, flex: "none", boxSizing: "border-box",
              borderRadius: big ? "calc(0.22 * var(--vw))" : "calc(0.14 * var(--vw))",
              border: `${big ? "calc(0.18 * var(--vw))" : "calc(0.12 * var(--vw))"} solid ${isOn ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)"}`,
              background: isOn ? "rgba(255,255,255,0.10)" : "transparent",
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
function SessionTag({ session }: { session: SessionKey }) {
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
function sessionInk(session: SessionKey): string {
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

function Lockup({ brand, who }: { brand: BrandKey | null; who: string }) {
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
     and the ON NOW / UP NEXT line above now spends it (2026-10-16). */
  return (
    <div style={{ marginBottom: last ? 0 : "calc(1.2 * var(--vh))" }}>
      <div style={{ minHeight: "calc(3.2 * var(--vw))", display: "flex", alignItems: "center", gap: "calc(0.8 * var(--vw))", marginBottom: "calc(0.4 * var(--vh))" }}>
        <Lockup brand={e.brand} who={e.who} />
        {e.session && <SessionTag session={e.session} />}
      </div>
      <div className="text-cond" style={{ fontSize: "calc(3.1 * var(--vw))", color: INK, lineHeight: 1.03 }}>
        {span(e.from, e.to)}
      </div>
      {/* display:flex so the row has no inherited 16px/1.5 line box under it. */}
      <div style={{ display: "flex", marginTop: "calc(0.5 * var(--vh))" }}>
        <CourtBoxes sport={sport} labels={labels} taken={e.courts} big={big} />
      </div>
    </div>
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

/* THE LIGHTS CHIP (2026-10-18) — the drawing only; WHICH state is lightChip's
   decision, in board-lib, with the reasoning. This is the look Aniket approved in
   the mock-up ("yes on the light chip"), four states:

     on      lit bulb, warm glow          LIGHTS ON
     offIn   lit bulb, the brand orange   LIGHTS OFF IN 8 MIN
     onIn    outline bulb, LABEL white    LIGHTS ON IN 12 MIN
     off     dim outline bulb             LIGHTS OFF

   ⛔ NEVER GREEN — on this board green means a court is free, and a green LIGHTS
   ON would read as "court open" from the desk — and never SESSION_GOLD, the girls'
   tag. ON is a lamp's warm yellow, not a status colour. The countdown takes
   SESSION_ORANGE, the board's own warning-strength colour, because it is the state
   that matters to a group still on court. LIGHTS OFF is deliberately dimmer than
   the 0.75 alpha this file otherwise keeps text above: it is the resting state and
   should read as one, not compete with the bookings.

   In em of the title it sits in (1.5vw), like the sport's object, so it stays
   locked to the title at any screen shape. */
const LIGHT_ON = "#FFE6A6";
const LIGHT_DIM = "rgba(255,255,255,0.42)";
const LIGHT_DIM_INK = "rgba(255,255,255,0.55)";

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
        height: "1.35em", width: "1.35em", display: "block", overflow: "visible",
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

function LightStatus({ chip }: { chip: LightChip }) {
  const look =
    chip.kind === "on" ? { lit: true, color: LIGHT_ON, ink: LIGHT_ON }
    : chip.kind === "offIn" ? { lit: true, color: SESSION_ORANGE, ink: SESSION_ORANGE }
    : chip.kind === "onIn" ? { lit: false, color: LABEL, ink: LABEL }
    : { lit: false, color: LIGHT_DIM, ink: LIGHT_DIM_INK };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.45em", whiteSpace: "nowrap",
        fontSize: "0.6em", letterSpacing: "0.1em", lineHeight: 1, color: look.ink,
        padding: "0.38em 0.75em 0.38em 0.55em", borderRadius: "999px",
        background: look.lit ? "rgba(255,230,166,0.10)" : "rgba(255,255,255,0.05)",
        border: `0.08em solid ${look.lit ? `${look.color}66` : "rgba(255,255,255,0.16)"}`,
      }}
    >
      <Bulb lit={look.lit} color={look.color} />
      {lightText(chip)}
    </span>
  );
}

/** How long the last `lights` outlives responses that come without it — see load(). */
const LIGHTS_CARRY_MS = 3 * 60_000;

export default function ReceptionBoard() {
  const [data, setData] = useState<NamedSlots | null>(null);
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);
  /** The last `lights` a response carried, and when (this TV's clock). */
  const lastLights = useRef<{ at: number; lights: Lights } | null>(null);

  useReloadOnDeploy();

  /* Fifteen seconds, NOT one: this decides which hour counts as "now" and so
     re-runs the grouping below. A row flipping up to a quarter minute late is
     the one error somebody standing at the desk would notice; re-grouping
     sixty times a minute for weeks is not worth removing it. The visible
     seconds come from <Clock/> (components/ScreenChrome), which re-renders a single span. */
  const tick = useTick(quarterMinuteTicker);

  useEffect(() => {
    mounted.current = true;
    const key = readKey();
    /* Unkeyed, the page asks the relay for the lights SCHEDULE too (?lights=1, 2026-10-18,
       Aniket: "Add there too"): the chip then follows the windows alone, with no
       bridge report and no override — those stay behind a TV's key. */
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

    const sports = Array.from(new Set(data.courts.map((c) => c.sport)));
    sports.sort((a, b) => {
      const ia = SPORT_ORDER.indexOf(a), ib = SPORT_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    const panels = sports.map((sport) => {
      const courts = data.courts.filter((c) => c.sport === sport);
      const ids = new Set(courts.map((c) => c.id));
      const label = new Map(courts.map((c) => [c.id, c.label || c.name]));
      const mine = data.blocks.filter((b) => ids.has(b.courtId));

      const live = mine.filter((b) => b.date === today && b.from <= minutes && minutes < b.to);

      /* Everything still to come: later today, then whole days after it.
         Merged with the SAME function as the live list so a booking that
         spans three courts is one line in both places — otherwise PBA would
         collapse while it is on and then fan back out to three rows the
         moment it became "upcoming". */
      const ahead = mine.filter(
        (b) => (b.date === today && b.from > minutes) || b.date > today,
      );

      const nowEntries = mergeBlocks(live, label);
      const { upNext, rest } = splitUpNext(nowEntries, mergeBlocks(ahead, label), UP_NEXT_MAX);

      return {
        sport,
        labels: [...new Set(courts.map((c) => label.get(c.id) ?? ""))]
          .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
        now: nowEntries,
        upNext,
        upcoming: rest.slice(0, UPCOMING_COUNT),
        /* On the same 15 s tick as everything else here (2026-10-18): the minutes
           in LIGHTS OFF IN n MIN are rounded up, so at worst one reads a quarter
           minute high — and the windows run 24 h ahead, so a failed poll keeps
           the count honest from the last good payload. */
        light: lightChip(sport, data.lights, tick),
      };
    });

    return { panels, today };
  }, [data, tick]);

  const { panels, today } = view;

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
          <div
            key={p.sport}
            style={{
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
            }}
          >
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

            {/* Centred, not top-aligned. A panel holding one booking against a
                full-height column otherwise leaves a third of the screen blank
                above the NEXT line, which from across the lobby reads as a
                broken screen rather than a quiet one. */}
            <div
              style={{
                flex: 1, minHeight: 0, overflow: "hidden",
                display: "flex", flexDirection: "column", justifyContent: "center",
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

            {/* COMING UP — the next UPCOMING_COUNT, each with its court.
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
                starts from the booking after that one, so neither is shown twice. */}
            <div style={{ borderTop: `1px solid ${RULE_SOFT}`, paddingTop: "calc(0.6 * var(--vh))" }}>
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
          </div>
        ))}
      </div>

      {/* The booking band — the same one /exit shows (components/ScreenChrome,
          2026-10-20), where it and its reasoning now live. */}
      <BookingBand />
    </div>
    </div>
  );
}
