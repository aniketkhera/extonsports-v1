"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import {
  PLATFORM, readKey, clubNow, span, holderLabel, brandOf,
  type BrandKey, type NamedSlots,
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

const SPORT_ORDER = ["Badminton", "Cricket", "Squash"];

/** One holder's hours, after courts have been merged. */
type Entry = {
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
  next: { when: string; what: string } | null;
};

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
        <span style={{ display: "block", color: "#f26b3a" }}>Philadelphia</span>
        <span style={{ display: "block", color: "#fff" }}>Badminton</span>
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
          <span style={{ display: "block", color: "#f26b3a" }}>Chester County</span>
          <span style={{ display: "block", color: "#fff" }}>Cricket Academy</span>
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
        style={{ fontSize: "1.6vw", letterSpacing: "0.08em", color: "#fff", lineHeight: 1.05 }}
      >
        SQUASH<span style={{ color: "#f26b3a" }}>TIGERS</span>
      </div>
    );
  }
  /* Unbranded holder — a member's own hire. Their name (or initials) is the
     lockup, which is why this prints `who` rather than nothing. */
  return (
    <div className="text-cond" style={{ fontSize: "1.5vw", color: "#fff", letterSpacing: "0.03em", lineHeight: 1.1 }}>
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
    const url = key ? `${PLATFORM}/api/public/court-board?days=2` : "/api/court-slots";
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

  const panels: Panel[] = useMemo(() => {
    /* `tick` is 0 until the ticker subscribes on mount, which is also what the
       server rendered — so the first pass draws an empty shell and the data
       arrives on the next tick. Depending on the NUMBER rather than on a Date
       object is what keeps this memo from re-running every render. */
    if (!data || !tick) return [];
    const { date: today, minutes } = clubNow(new Date(tick));
    const i = data.days.indexOf(today);
    const tomorrow = i >= 0 ? data.days[i + 1] : undefined;

    const sports = Array.from(new Set(data.courts.map((c) => c.sport)));
    sports.sort((a, b) => {
      const ia = SPORT_ORDER.indexOf(a), ib = SPORT_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    return sports.map((sport) => {
      const courts = data.courts.filter((c) => c.sport === sport);
      const ids = new Set(courts.map((c) => c.id));
      const label = new Map(courts.map((c) => [c.id, c.label || c.name]));
      const mine = data.blocks.filter((b) => ids.has(b.courtId));

      const live = mine.filter((b) => b.date === today && b.from <= minutes && minutes < b.to);

      /* Merge on (holder, from, to) — never on time alone. */
      const byKey = new Map<string, Entry>();
      for (const b of live) {
        const who = holderLabel(b);
        const k = `${who}|${b.from}|${b.to}`;
        const found = byKey.get(k);
        if (found) found.courts.push(label.get(b.courtId) ?? "");
        else byKey.set(k, { from: b.from, to: b.to, who, brand: brandOf(b.who), courts: [label.get(b.courtId) ?? ""] });
      }
      const entries = [...byKey.values()].sort((a, b) => a.from - b.from);
      for (const e of entries) e.courts.sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

      const busyIds = new Set(live.map((b) => b.courtId));

      const laterToday = mine
        .filter((b) => b.date === today && b.from > minutes)
        .sort((a, b) => a.from - b.from)[0];
      const firstTomorrow = tomorrow
        ? mine.filter((b) => b.date === tomorrow).sort((a, b) => a.from - b.from)[0]
        : undefined;
      const nxt = laterToday ?? firstTomorrow;

      return {
        sport,
        total: courts.length,
        freeNow: courts.length - busyIds.size,
        now: entries,
        next: nxt
          ? {
              when: `${laterToday ? "" : "Tomorrow "}${span(nxt.from, nxt.to)}`,
              what: holderLabel(nxt),
            }
          : null,
      };
    });
  }, [data, tick]);

  const courtsOf = (p: Panel, e: Entry) => courtsLabel(p.sport, e.courts);

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "#0f1821", color: "#fff",
        display: "flex", flexDirection: "column", padding: "2.1vh 1.9vw",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: "1px solid rgba(255,255,255,0.20)",
          paddingBottom: "1.2vh", marginBottom: "1.6vh",
        }}
      >
        <div className="text-cond" style={{ color: "#f26b3a", fontSize: "2.1vw", letterSpacing: "0.10em" }}>
          EXTON SPORTS CENTER
          {stale && (
            <span
              aria-hidden
              style={{
                display: "inline-block", width: "0.5vw", height: "0.5vw", borderRadius: "50%",
                background: "rgba(255,255,255,0.3)", marginLeft: "0.6vw", verticalAlign: "middle",
              }}
            />
          )}
        </div>
        <div className="text-cond" style={{ color: "#f26b3a", fontSize: "2.4vw", lineHeight: 1 }}>
          <Clock />
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(panels.length, 1)}, 1fr)`, gap: "1.4vw", minHeight: 0 }}>
        {panels.map((p) => (
          <div
            key={p.sport}
            style={{
              display: "flex", flexDirection: "column", minWidth: 0,
              background: "rgba(255,255,255,0.045)", borderRadius: "0.6vw", padding: "1.4vh 1vw",
            }}
          >
            <div className="text-cond" style={{ fontSize: "1.5vw", letterSpacing: "0.15em", color: "rgba(255,255,255,0.55)", marginBottom: "0.9vh" }}>
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
                <div className="text-cond" style={{ fontSize: "3.1vw", color: "#5fd398", lineHeight: 1.03 }}>
                  ALL OPEN
                </div>
              ) : (
                p.now.map((e) => (
                  <div key={`${e.who}-${e.from}-${e.to}`} style={{ marginBottom: "1.2vh" }}>
                    <div style={{ minHeight: "3.2vw", display: "flex", alignItems: "center", marginBottom: "0.4vh" }}>
                      <Lockup brand={e.brand} who={e.who} />
                    </div>
                    <div className="text-cond" style={{ fontSize: "3.1vw", color: "#fff", lineHeight: 1.03 }}>
                      {span(e.from, e.to)}
                    </div>
                    <div className="text-cond" style={{ fontSize: "1.3vw", color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
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
                color: p.freeNow ? "#5fd398" : "rgba(255,255,255,0.4)",
              }}
            >
              {p.freeNow} OF {p.total} FREE NOW
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.11)", paddingTop: "0.7vh" }}>
              <div className="text-cond" style={{ fontSize: "1vw", letterSpacing: "0.16em", color: "rgba(255,255,255,0.32)" }}>
                NEXT
              </div>
              {/* Two lines, then clipped. A holder's full name plus a time runs
                  wider than a third of the screen — "TOMORROW 9:30 PM – 12 AM ·
                  JEYARAM RAVEENDRAN" overflowed the panel on the first build.
                  The time leads, so a clipped second line costs the end of a
                  name rather than the hour somebody is reading for. */}
              <div
                className="text-cond"
                style={{
                  fontSize: "1.2vw", color: "rgba(255,255,255,0.62)", lineHeight: 1.2,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {p.next ? `${p.next.when} · ${p.next.what}` : "Nothing booked"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
