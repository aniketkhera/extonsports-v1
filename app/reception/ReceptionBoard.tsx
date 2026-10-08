"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import {
  PLATFORM, readKey, clubNow, span, holderLabel, brandOf,
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

/** How many bookings to list under the live one. Asked for by Aniket 8 Oct 2026. */
const UPCOMING_COUNT = 5;

/* Merge blocks into entries on (holder, from, to) — and on DATE too, now that
   the list runs past today.

   ⚠️ NEVER MERGE ON TIME ALONE. Two different members on two courts in the
   same hour are two bookings; collapsing them would put one person's name
   over the other's court. The holder is part of the key for that reason, and
   the date joined it the moment this stopped being a today-only screen —
   without it, PBA's Monday 17:30 and Wednesday 17:30 would fold together. */
function mergeBlocks(blocks: NamedBlock[], label: Map<string, string>): Entry[] {
  const byKey = new Map<string, Entry>();
  for (const b of blocks) {
    const who = holderLabel(b);
    const k = `${b.date}|${who}|${b.from}|${b.to}`;
    const found = byKey.get(k);
    if (found) found.courts.push(label.get(b.courtId) ?? "");
    else {
      byKey.set(k, {
        date: b.date, from: b.from, to: b.to, who,
        brand: brandOf(b.who), courts: [label.get(b.courtId) ?? ""],
      });
    }
  }
  const out = [...byKey.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.from - b.from,
  );
  for (const e of out) e.courts.sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  return out;
}

/* "" for today, "Tomorrow", else a short weekday. Built from the date STRING's
   own parts rather than by parsing it — new Date("2026-10-09") is UTC
   midnight, which formats as the 8th in New York and would label every future
   booking a day early. */
function dayLabel(date: string, today: string, tomorrow: string | undefined): string {
  if (date === today) return "";
  if (tomorrow && date === tomorrow) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(y, m - 1, d));
}

/* "1","2","3" -> "Courts 1–3"; "1","3" -> "Courts 1, 3". Ranges only collapse
   when the labels are consecutive integers, because a club that labels a court
   "A" or "Centre" must not get a nonsense range out of this. */
function courtsLabel(sport: string, labels: string[]): string {
  const noun = sport === "Cricket" ? "Lane" : "Court";
  const nums = labels.map((l) => Number(l));
  const allNums = nums.every((n) => Number.isInteger(n));
  const consecutive =
    allNums && nums.length > 1 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (labels.length === 1) return `${noun} ${labels[0]}`;
  if (consecutive) return `${noun}s ${labels[0]}–${labels[labels.length - 1]}`;
  return `${noun}s ${labels.join(", ")}`;
}

/* The clock, isolated so the seconds do not re-render the board.
   Aniket asked for seconds (2026-10-07). At one tick per second the whole
   board would otherwise re-run its grouping sixty times a minute for weeks;
   keeping it in its own component means only this <span> updates, and the
   board's own clock stays on the slower tick that decides which hour is "now". */
function Clock() {
  const ms = useTick(secondTicker);
  const text = ms
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
      }).format(new Date(ms))
    : " ";
  /* Tabular figures: without them the colon jitters left and right every
     second as the digit widths change, which is very visible on a wall. */
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
      {text}
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
  /* Unbranded holder — a member's own hire. Their name (or initials) is the
     lockup, which is why this prints `who` rather than nothing. */
  return (
    <div className="text-cond" style={{ fontSize: "1.5vw", color: INK, letterSpacing: "0.03em", lineHeight: 1.1 }}>
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
    const url = key ? `${PLATFORM}/api/public/court-board?days=7` : "/api/court-slots";
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

  const view = useMemo((): { panels: Panel[]; today: string; tomorrow?: string } => {
    /* `tick` is 0 until the ticker subscribes on mount, which is also what the
       server rendered — so the first pass draws an empty shell and the data
       arrives on the next tick. Depending on the NUMBER rather than on a Date
       object is what keeps this memo from re-running every render. */
    if (!data || !tick) return { panels: [], today: "" };
    const { date: today, minutes } = clubNow(new Date(tick));
    const i = data.days.indexOf(today);
    const tomorrow = i >= 0 ? data.days[i + 1] : undefined;

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

    return { panels, today, tomorrow };
  }, [data, tick]);

  const { panels, today, tomorrow } = view;

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
              background: PANEL, borderRadius: "0.6vw", padding: "1.4vh 1vw",
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
                  const day = dayLabel(e.date, today, tomorrow);
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
