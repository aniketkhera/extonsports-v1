"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import {
  PLATFORM, readKey, clubNow, span, holderLabel, brandFor,
  type BrandKey, type NamedBlock, type NamedSlots,
} from "../board/board-lib";

/* A clock as an EXTERNAL STORE, not as state set from an effect.
   ──────────────────────────────────────────────────────────────────────────
   Time is not React state — it is an outside system that changes on its own,
   which is precisely what useSyncExternalStore is for. Doing it the obvious
   way (useState + setState inside useEffect) trips react-hooks/set-state-in-
   effect and causes a cascading render on every mount; /board still has that
   shape and should be moved onto this when it is next touched.

   The snapshot is 0 until something subscribes, and getServerSnapshot returns
   0 too, so the server and the first client render agree and there is no
   hydration mismatch. The interval is shared by every subscriber and is torn
   down when the last one leaves, which matters on a screen that stays open
   for weeks. */
function makeTicker(ms: number) {
  let snapshot = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const subs = new Set<() => void>();
  return {
    subscribe(cb: () => void) {
      subs.add(cb);
      if (!timer) {
        snapshot = Date.now();
        timer = setInterval(() => {
          snapshot = Date.now();
          subs.forEach((f) => f());
        }, ms);
      }
      return () => {
        subs.delete(cb);
        if (!subs.size && timer) { clearInterval(timer); timer = null; }
      };
    },
    /* Must be referentially stable between calls within one render pass, which
       it is: only the interval ever writes it. Returning Date.now() here would
       loop forever. */
    get: () => snapshot,
    getServer: () => 0,
  };
}

/** Visible seconds for the clock. */
const secondTicker = makeTicker(1_000);
/** Decides which hour counts as "now". Slower on purpose — see the board below. */
const quarterMinuteTicker = makeTicker(15_000);

function useTick(t: ReturnType<typeof makeTicker>): number {
  return useSyncExternalStore(t.subscribe, t.get, t.getServer);
}

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

/* ── THE TV PALETTE ───────────────────────────────────────────────────────────
   Brighter than the web palette, deliberately, and kept here as one block so
   it can be tuned in one place.

   Aniket read the first build from across the lobby on 2026-10-07 and called
   it dull. Two causes, both fixed here:

   1. MOST OF THE TEXT WAS TRANSLUCENT. Nine different alpha whites between
      0.045 and 0.78. On a 55" panel a few metres away anything under about
      0.75 stops reading as white and starts reading as grey — the labels and
      the NEXT lines were the worst of it. They are near-opaque now, and the
      hierarchy is carried by SIZE instead, which survives distance.
   2. THE ORANGE WAS NOT THE BRAND ORANGE. It was #f26b3a, a darker and more
      saturated colour than globals.css's --color-ember (#F89B72). EMBER below
      is brighter again than even --color-ember-hi (#FBB28C).

   ⚠️ LITERALS, NOT TOKENS — same rule as board.css and comingsoon.module.css.
   The site's light theme redefines --color-* under :root[data-theme="light"],
   and from 2026-10-07 light is the DEFAULT. A screen built on tokens would
   have turned into dark text on a dark ground with nobody in the room. */
const BG = "#0B1623";
const INK = "#FFFFFF";
/** Brighter than --color-ember-hi; the header, the clock and brand accents. */
const EMBER = "#FFBE97";
/** Brighter than --color-green-hi (#5CC766) — "open" has to carry the room. */
const GREEN = "#79EA92";
const LABEL = "rgba(255,255,255,0.86)";
const META = "rgba(255,255,255,0.80)";
const NEXT_VAL = "rgba(255,255,255,0.88)";
const NEXT_LBL = "rgba(255,255,255,0.62)";
const MUTED = "rgba(255,255,255,0.70)";
const RULE = "rgba(255,255,255,0.34)";
const RULE_SOFT = "rgba(255,255,255,0.22)";
const PANEL = "rgba(255,255,255,0.075)";
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
const PANEL_SHADOW = [
  "0 1.7vh 3.8vh rgba(0,0,0,0.66)",            // the box sits off the wall
  "0 0.5vh 1.1vh rgba(0,0,0,0.45)",            // the contact shadow under it
  "0 0 1.4vh rgba(248,155,114,0.22)",          // the edge picks up its own light
  "inset 0 0.18vh 0 rgba(255,255,255,0.34)",   // lit top edge
  "inset 0 -0.45vh 1vh rgba(0,0,0,0.38)",      // shaded foot
].join(", ");

const SPORT_ORDER = ["Badminton", "Cricket", "Squash"];

/** One holder's hours, after courts have been merged. */
type Entry = {
  /** Club-local YYYY-MM-DD. Needed now that the list runs past today. */
  date: string;
  from: number;
  to: number;
  who: string;
  brand: BrandKey | null;
  /** Court labels in the order they appear, e.g. ["1","2","3"]. */
  courts: string[];
};

type Panel = {
  sport: string;
  total: number;
  freeNow: number;
  now: Entry[];
  upcoming: Entry[];
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

      const byWho = new Map<string, Entry>();
      for (const b of covering) {
        const who = holderLabel(b);
        const found = byWho.get(who);
        if (found) found.courts.push(label.get(b.courtId) ?? "");
        else {
          byWho.set(who, {
            date, from, to, who,
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

/* "1","2","3" -> "Courts 1, 2, 3". EVERY COURT IS NAMED; there is no range.
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

/* The clock, isolated so the seconds do not re-render the board.
   Aniket asked for seconds (2026-10-07). At one tick per second the whole
   board would otherwise re-run its grouping sixty times a minute for weeks;
   keeping it in its own component means only this <span> updates, and the
   board's own clock stays on the slower tick that decides which hour is "now". */
function Clock() {
  const ms = useTick(secondTicker);
  const at = ms ? new Date(ms) : null;
  const text = at
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
      }).format(at)
    : " ";
  /* Day AND date above the time. Aniket asked for it on all the televisions,
     2026-10-10; this screen carried no date at all, only the time.

     The year is in it deliberately. This board runs for months unattended, and
     a frozen clock still reads like a plausible time of day while a weekday
     alone repeats every seven days -- neither tells anyone the picture is
     stale. A wrong year is unmistakable. (The faint dot by the title is the
     honest staleness signal, but it only shows when a FETCH fails; a tv-keeper
     relaunch onto a cached page would show neither.)

     Formatted in America/New_York like the time, not in the browser's zone: the
     VIZIOs have whatever timezone they shipped with and tv-keeper does not set
     it, so trusting the device is how the wall ends up a day out.

     The non-breaking space above is load-bearing and is kept: an empty string
     collapses the span before the first tick and the header jumps. */
  const dateText = at
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }).format(at)
    : " ";
  /* Tabular figures: without them the colon jitters left and right every
     second as the digit widths change, which is very visible on a wall. */
  return (
    /* One line, as asked (2026-10-10). Baseline alignment, so the small date
       sits on the same footing as the big numerals instead of floating at
       their centre. */
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.6em" }}>
      {/* 0.42 of the clock's own size, so it reads as a label rather than
          competing with the time from across the lobby. Not uppercased -- the
          title beside it already is, and two shouting lines flatten the
          hierarchy the desk reads this screen by.

          nowrap because this sits in a space-between header: without it the
          date is the only wrappable thing in the row and it would break mid
          month rather than push. */}
      <span
        style={{
          fontSize: "0.42em", letterSpacing: "0.14em",
          color: MUTED, whiteSpace: "nowrap",
        }}
      >
        {dateText}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
        {text}
      </span>
    </span>
  );
}

function Lockup({ brand, who }: { brand: BrandKey | null; who: string }) {
  if (brand === "philadelphia-badminton") {
    return (
      <div
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.02,
          fontSize: "1.55vw",
        }}
      >
        <span style={{ display: "block", color: EMBER }}>Philadelphia</span>
        <span style={{ display: "block", color: INK }}>Badminton</span>
      </div>
    );
  }
  if (brand === "ccca") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.6vw" }}>
        <Image
          src="/academies/ccca-shield.png"
          alt=""
          width={360}
          height={239}
          style={{ height: "3.1vw", width: "auto" }}
        />
        <div className="text-cond" style={{ fontSize: "1.15vw", lineHeight: 1.08, letterSpacing: "0.04em" }}>
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
        style={{ fontSize: "1.6vw", letterSpacing: "0.08em", color: INK, lineHeight: 1.05 }}
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
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5vw" }}>
        <span
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 700, fontSize: "2vw", lineHeight: 1, color: EMBER,
          }}
        >
          SeRa
        </span>
        <span
          className="text-cond"
          style={{ fontSize: "1.05vw", letterSpacing: "0.18em", color: INK, whiteSpace: "nowrap" }}
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
        fontSize: "1.5vw",
        color: isPrivate ? MUTED : INK,
        letterSpacing: isPrivate ? "0.06em" : "0.03em",
        lineHeight: 1.1,
      }}
    >
      {who}
    </div>
  );
}

export default function ReceptionBoard() {
  const [data, setData] = useState<NamedSlots | null>(null);
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);

  useReloadOnDeploy();

  /* Fifteen seconds, NOT one: this decides which hour counts as "now" and so
     re-runs the grouping below. A row flipping up to a quarter minute late is
     the one error somebody standing at the desk would notice; re-grouping
     sixty times a minute for weeks is not worth removing it. The visible
     seconds come from <Clock/>, which re-renders a single span. */
  const tick = useTick(quarterMinuteTicker);

  useEffect(() => {
    mounted.current = true;
    const key = readKey();
    const url = key ? `${PLATFORM}/api/public/court-board?days=21` : "/api/court-slots";
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
        setData(body);
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

      const busyIds = new Set(live.map((b) => b.courtId));

      return {
        sport,
        total: courts.length,
        freeNow: courts.length - busyIds.size,
        now: mergeBlocks(live, label),
        upcoming: mergeBlocks(ahead, label).slice(0, UPCOMING_COUNT),
      };
    });

    return { panels, today };
  }, [data, tick]);

  const { panels, today } = view;

  const courtsOf = (p: Panel, e: Entry) => courtsLabel(p.sport, e.courts);

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: BG, color: INK,
        display: "flex", flexDirection: "column", padding: "2.7vh 2.2vw",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: `1px solid ${RULE}`,
          paddingBottom: "1.2vh", marginBottom: "1.6vh",
        }}
      >
        <div className="text-cond" style={{ color: EMBER, fontSize: "2.1vw", letterSpacing: "0.10em" }}>
          EXTON SPORTS CENTER
          {stale && (
            <span
              aria-hidden
              style={{
                display: "inline-block", width: "0.5vw", height: "0.5vw", borderRadius: "50%",
                background: RULE, marginLeft: "0.6vw", verticalAlign: "middle",
              }}
            />
          )}
        </div>
        <div className="text-cond" style={{ color: EMBER, fontSize: "2.4vw", lineHeight: 1 }}>
          <Clock />
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(panels.length, 1)}, 1fr)`, gap: "1.4vw", minHeight: 0 }}>
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
              border: `0.22vw solid ${PANEL_BORDER}`,
              boxShadow: PANEL_SHADOW,
              borderRadius: "0.6vw", padding: "1.4vh 1vw",
            }}
          >
            <div className="text-cond" style={{ fontSize: "1.5vw", letterSpacing: "0.15em", color: LABEL, marginBottom: "0.9vh" }}>
              {p.sport.toUpperCase()}
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
              {p.now.length === 0 ? (
                <div className="text-cond" style={{ fontSize: "3.1vw", color: GREEN, lineHeight: 1.03 }}>
                  ALL OPEN
                </div>
              ) : (
                p.now.map((e) => (
                  <div key={`${e.who}-${e.from}-${e.to}`} style={{ marginBottom: "1.2vh" }}>
                    <div style={{ minHeight: "3.2vw", display: "flex", alignItems: "center", marginBottom: "0.4vh" }}>
                      <Lockup brand={e.brand} who={e.who} />
                    </div>
                    <div className="text-cond" style={{ fontSize: "3.1vw", color: INK, lineHeight: 1.03 }}>
                      {span(e.from, e.to)}
                    </div>
                    <div className="text-cond" style={{ fontSize: "1.3vw", color: META, letterSpacing: "0.04em" }}>
                      {courtsOf(p, e)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              className="text-cond"
              style={{
                fontSize: "1.45vw", letterSpacing: "0.06em", marginBottom: "0.7vh",
                color: p.freeNow ? GREEN : MUTED,
              }}
            >
              {p.freeNow} OF {p.total} FREE NOW
            </div>

            {/* COMING UP — the next five, each with its court.
                ────────────────────────────────────────────────────────────
                Three columns on one line per booking: time, holder, court.
                A single wrapped line per booking would cost ten lines for
                five bookings and there is not room, so each row is clipped
                to one line and the HOLDER is the only part allowed to
                truncate. The time and the court are fixed-width at the two
                ends because they are what somebody at the desk is actually
                answering questions about ("who's got court 2 at eight?").

                The day prefix appears only when it is not today, so a list
                that stays inside today carries no repeated noise. */}
            <div style={{ borderTop: `1px solid ${RULE_SOFT}`, paddingTop: "0.6vh" }}>
              <div className="text-cond" style={{ fontSize: "1vw", letterSpacing: "0.16em", color: NEXT_LBL }}>
                COMING UP
              </div>
              {p.upcoming.length === 0 ? (
                <div className="text-cond" style={{ fontSize: "1.2vw", color: NEXT_VAL, lineHeight: 1.35 }}>
                  Nothing booked
                </div>
              ) : (
                p.upcoming.map((e) => {
                  const day = dayLabel(e.date, today);
                  return (
                    <div
                      key={`${e.date}-${e.from}-${e.who}`}
                      className="text-cond"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto minmax(0,1fr) auto",
                        gap: "0 0.5vw",
                        fontSize: "1.12vw", lineHeight: 1.34, color: NEXT_VAL,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ color: INK }}>
                        {day ? `${day} ` : ""}{span(e.from, e.to)}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.who}</span>
                      <span style={{ color: NEXT_LBL }}>{courtsOf(p, e)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
