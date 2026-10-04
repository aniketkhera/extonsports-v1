"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { CourtSlots, SlotBlock } from "../api/court-slots/route";
import { SPORT_ORDER } from "../../lib/rates";
import { SPORT_BOOKING_OPENS_LABEL, sportShutOnDate, CLUB_TZ } from "../../lib/opening";
import { BOOK_COURTS_URL } from "../../lib/booking";

/* The public calendar of bookings.
   ────────────────────────────────────────────────────────────────────────
   Every court, every half hour, taken or free — the SHAPE of the day. The
   rate card's hover panel already answers "how much of the week is gone"
   as a count per sport and band; this answers "is court 3 free at 6pm",
   which a count cannot. Both read the same occupancy table through
   different endpoints, and neither is derivable from the other.

   ⛔ WHAT A VISITOR SEES IS A COURT, A TIME AND ONE OF TWO WORDS. No name,
   no booking id, no headcount. That is settled upstream, not here: the club
   runs with `hide_schedule_details` on, so its own signed-in members already
   see this grid with the whos removed. A stranger gets strictly less.

   ⚠️ IT PORTALS TO document.body, AND IT HAS TO. The hero's panels are
   framer-motion elements that animate `y`, which is a transform, and a
   transformed ancestor makes `position: fixed` resolve against THAT box
   instead of the viewport. Rendered in place, the overlay would sit inside
   the left hero panel and scroll with it. */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* The window the grid opens on, in minutes from local midnight. The club is
   24/7 — there are no closing hours to grey out — so SOME window has to be
   chosen or every day is 48 rows tall, six of them permanently empty.
   3pm–11pm is the span people actually book.

   ⚠️ IT IS A FLOOR, NOT A CLAMP. The window stretches to swallow any booked
   hour outside it, because a calendar that hides a committed hour is not
   compact, it is wrong: Philadelphia Badminton holds all three courts 9–11am
   on a Saturday and Chester County Cricket has lanes 1 and 2 from 10am, so a
   hard 3pm start would draw Saturday morning as open floor. "Show every
   hour" is still there for the 6am squash player. */
const CORE_FROM = 15 * 60;
const CORE_TO = 23 * 60;
const STEP = 30;

type CellState = "free" | "booking" | "programme" | "shut" | "past";

/** Minutes from midnight, club-local, for an instant — or null on another day. */
function minutesIfOn(date: string, now: Date): number | null {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  if (`${p.year}-${p.month}-${p.day}` !== date) return null;
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
}

/* "Thu 8", composed rather than formatted.
   ⚠️ toLocaleDateString(…, { weekday: "short", day: "numeric" }) renders
   "8 Thu" in this runtime, which reads as a quantity. Same trap as WeekStrip
   and MobileHeat in Hero.tsx — all three compose by hand for this reason. */
function dayLabel(date: string): { dow: string; num: number } {
  const d = new Date(`${date}T12:00:00`);
  return { dow: DOW[d.getDay()], num: d.getDate() };
}

function clockLabel(min: number): string {
  const m = min % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return mm === 0 ? `${h12} ${ampm}` : `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export default function BookingsCalendar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<CourtSlots | null>(null);
  const [failed, setFailed] = useState(false);
  const [dayPicked, setDayPicked] = useState<number | null>(null);
  const [allHours, setAllHours] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [sportIdx, setSportIdx] = useState(0);
  /* Whether the reader has chosen a sport themselves; see autoSportIdx. */
  const [sportPicked, setSportPicked] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* The one-sport-at-a-time layout cannot be done in CSS alone, so the
     breakpoint has to reach JS. The first read is deferred by a tick for the
     same reason Hero.tsx defers its own `isMobile` read: setting state
     synchronously inside an effect body is a cascading render, and the lint
     rule that says so is on in this repo. */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const h = (e: MediaQueryListEvent) => setNarrow(e.matches);
    const t = setTimeout(() => setNarrow(mq.matches), 0);
    mq.addEventListener("change", h);
    return () => { clearTimeout(t); mq.removeEventListener("change", h); };
  }, []);

  /* Fetched on first open, not on mount: most visitors never open this, and
     the hero already makes two calls on load. Kept afterwards — a reopen in
     the same visit is free, and the data moves by the minute, not the second. */
  useEffect(() => {
    if (!open || data) return;
    let live = true;
    fetch("/api/court-slots")
      .then((r) => r.json())
      .then((j: CourtSlots) => {
        if (!live) return;
        if (j?.days?.length) setData(j);
        else setFailed(true);
      })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [open, data]);

  /* ⚠️ IT DOES NOT OPEN ON TODAY DURING OPENING WEEK, AND THAT IS THE POINT.
     The sports come online across the first week — squash the 5th, badminton
     the 6th, cricket the 8th — so on the 4th every court on every row is
     "not bookable yet" and the calendar's first impression is a full screen of
     dashed boxes. It lands instead on the first day something can actually be
     booked. Once the week has passed, that day IS today and this is a no-op.

     Derived, not stored: this is a function of the data, and writing it into
     state from an effect would both trip react-hooks/set-state-in-effect and
     render one frame on the wrong day before correcting itself. */
  const autoDayIdx = useMemo(() => {
    if (!data) return 0;
    const sports = [...new Set(data.courts.map((c) => c.sport))];
    const i = data.days.findIndex((d) => sports.some((s) => !sportShutOnDate(s, d)));
    return i > 0 ? i : 0;
  }, [data]);
  const dayIdx = dayPicked ?? autoDayIdx;

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    /* The page behind must not scroll while a full-screen sheet is up — on a
       phone the body scrolls under the overlay otherwise and the grid appears
       to drift. Restored exactly, not set to "", so a value set elsewhere
       survives. */
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const date = data?.days[dayIdx] ?? "";

  /* Courts in the site's own order (Cricket, Badminton, Squash — SPORT_ORDER,
     which the rate card and the footer also map), not the endpoint's
     alphabetical one. A sport the site does not list still renders, at the
     end, rather than vanishing. */
  const groups = useMemo(() => {
    if (!data) return [];
    const bySport = new Map<string, CourtSlots["courts"]>();
    for (const c of data.courts) {
      if (!bySport.has(c.sport)) bySport.set(c.sport, []);
      bySport.get(c.sport)!.push(c);
    }
    const known = SPORT_ORDER.filter((s) => bySport.has(s));
    const rest = [...bySport.keys()].filter((s) => !SPORT_ORDER.includes(s)).sort();
    return [...known, ...rest].map((sport) => ({ sport, courts: bySport.get(sport)! }));
  }, [data]);

  /* ⚠️ THE PHONE MUST NOT OPEN ON A SPORT THAT CANNOT BE BOOKED YET. One
     sport shows at a time at 375px, and SPORT_ORDER starts with cricket —
     which is the LAST of the three to come online (the 8th). Tab one was
     therefore a screen of dashed boxes with nothing to read, on the device
     most people will see this on. Until the reader picks a sport themselves
     it tracks the day: the first sport that is actually bookable on it. */
  const autoSportIdx = useMemo(() => {
    if (!groups.length) return 0;
    const i = groups.findIndex((g) => !sportShutOnDate(g.sport, date));
    return i >= 0 ? i : 0;
  }, [groups, date]);
  const effSportIdx = sportPicked ? Math.min(sportIdx, groups.length - 1) : autoSportIdx;

  const shown = narrow && groups.length ? [groups[effSportIdx]] : groups;
  const courts = shown.flatMap((g) => g.courts);
  /* Every sport on screen is shut on this date — so the grid is drawing
     nothing a reader can act on, and has to say why rather than look broken. */
  const allShut = shown.length > 0 && shown.every((g) => sportShutOnDate(g.sport, date));

  const dayBlocks = useMemo(
    () => (data ? data.blocks.filter((b) => b.date === date) : []),
    [data, date],
  );

  /* One lookup per court for the whole day, so the cell loop below is a map
     hit rather than a scan of every block for every one of ~500 cells. */
  const byCourt = useMemo(() => {
    const m = new Map<string, SlotBlock[]>();
    for (const b of dayBlocks) {
      if (!m.has(b.courtId)) m.set(b.courtId, []);
      m.get(b.courtId)!.push(b);
    }
    return m;
  }, [dayBlocks]);

  const [winFrom, winTo] = useMemo(() => {
    if (allHours) return [0, 1440];
    let lo = CORE_FROM;
    let hi = CORE_TO;
    for (const b of dayBlocks) {
      lo = Math.min(lo, Math.floor(b.from / 60) * 60);
      hi = Math.max(hi, Math.ceil(b.to / 60) * 60);
    }
    return [Math.max(0, lo), Math.min(1440, hi)];
  }, [dayBlocks, allHours]);

  const rows: number[] = [];
  for (let m = winFrom; m < winTo; m += STEP) rows.push(m);

  const nowMin = date ? minutesIfOn(date, new Date()) : null;

  function stateOf(courtId: string, sport: string, slot: number): CellState {
    const hit = byCourt.get(courtId)?.find((b) => slot >= b.from && slot < b.to);
    if (hit) return hit.kind;
    /* Taken beats shut on purpose: a sport can have hours committed before the
       day it opens for public booking — Philadelphia Badminton is on court
       Monday the 5th while badminton bookings open on the 6th. Drawing that
       hour as empty-and-shut would be two wrongs. */
    if (sportShutOnDate(sport, date)) return "shut";
    if (nowMin !== null && slot + STEP <= nowMin) return "past";
    return "free";
  }

  /* No `mounted` flag guarding the portal: `open` only ever becomes true from
     a click, so by the time createPortal runs we are unambiguously on the
     client. A mounted flag would be a second piece of state saying the same
     thing, set from an effect — which this repo's lint rightly rejects. */
  if (!open) return null;

  const rowH = narrow ? 20 : 15;
  const gutter = narrow ? 44 : 50;

  const FILL: Record<CellState, string> = {
    free: "rgba(255,255,255,0.03)",
    booking: "rgba(255,255,255,0.20)",
    /* A second tone, not a second colour. The academy hours are the club's
       standing contracts and the site already prints their timetable in words
       (lib/floor.ts), so they are labelled — but they are still "not yours to
       book", which is the same message the solid blocks carry. Green would
       say "available". */
    programme: "rgba(66,181,77,0.30)",
    shut: "transparent",
    past: "rgba(255,255,255,0.015)",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calendar of bookings"
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(10,16,25,0.88)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full outline-none"
        style={{
          maxWidth: 1100,
          margin: narrow ? "0" : "40px 0",
          background: "var(--color-ink)",
          border: "1px solid var(--color-line)",
          padding: narrow ? "16px 12px 24px" : "20px 24px 26px",
          minHeight: narrow ? "100%" : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-cond text-white" style={{ fontSize: "clamp(1.25rem, 2.6vw, 1.9rem)" }}>
              Calendar of bookings
            </h2>
            <p className="text-white/45 mt-1" style={{ fontSize: "0.72rem", maxWidth: "48ch" }}>
              Every court, as it stands. Taken hours are shown without any detail of who
              has them.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close the calendar"
            className="text-mono text-white/55 hover:text-white border border-white/20 hover:border-white/50 transition-colors shrink-0"
            style={{ fontSize: "0.58rem", padding: "7px 12px" }}
          >
            Close
          </button>
        </div>

        {failed && (
          <p className="text-white/50 py-8" style={{ fontSize: "0.8rem" }}>
            The calendar is not loading just now. Court availability is live on{" "}
            <a
              href={BOOK_COURTS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-white border-b border-[var(--color-ember)]/55 hover:border-[var(--color-ember)] transition-colors"
            >
              app.orangish.io
            </a>.
          </p>
        )}

        {!failed && !data && (
          <p className="text-white/40 py-8" style={{ fontSize: "0.8rem" }}>Loading the week…</p>
        )}

        {data && (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
              {data.days.map((d, i) => {
                const { dow, num } = dayLabel(d);
                const on = i === dayIdx;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayPicked(i)}
                    aria-pressed={on}
                    className="text-mono shrink-0 transition-colors"
                    style={{
                      fontSize: "0.56rem",
                      padding: "5px 9px",
                      background: on ? "var(--color-ember)" : "transparent",
                      color: on ? "#0A1019" : "rgba(255,255,255,0.6)",
                      border: `1px solid ${on ? "var(--color-ember)" : "rgba(255,255,255,0.16)"}`,
                    }}
                  >
                    {dow} {num}
                  </button>
                );
              })}
            </div>

            {narrow && groups.length > 1 && (
              <div className="flex gap-1.5 mt-2">
                {groups.map((g, i) => (
                  <button
                    key={g.sport}
                    type="button"
                    onClick={() => { setSportIdx(i); setSportPicked(true); }}
                    aria-pressed={i === effSportIdx}
                    className="text-mono flex-1 transition-colors"
                    style={{
                      fontSize: "0.56rem",
                      padding: "7px 4px",
                      background: i === effSportIdx ? "rgba(255,255,255,0.09)" : "transparent",
                      color: i === effSportIdx ? "#fff" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${i === effSportIdx ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.14)"}`,
                    }}
                  >
                    {g.sport}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3" style={{ fontSize: "0.56rem" }}>
              <div
                className="grid"
                style={{ gridTemplateColumns: `${gutter}px repeat(${courts.length}, minmax(0, 1fr))` }}
              >
                <span />
                {shown.map((g) => (
                  <span
                    key={g.sport}
                    className="text-mono text-center"
                    style={{
                      gridColumn: `span ${g.courts.length}`,
                      color: sportShutOnDate(g.sport, date) ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.58)",
                      paddingBottom: 3,
                    }}
                  >
                    {g.sport}
                  </span>
                ))}

                <span />
                {courts.map((c) => (
                  <span key={c.id} className="text-center" style={{ color: "rgba(255,255,255,0.33)", paddingBottom: 3 }}>
                    {c.label}
                  </span>
                ))}
              </div>

              <div
                className="grid"
                style={{ gridTemplateColumns: `${gutter}px repeat(${courts.length}, minmax(0, 1fr))` }}
              >
                {rows.map((slot) => {
                  const onHour = slot % 60 === 0;
                  return (
                    <Fragment key={slot}>
                      <span
                        style={{
                          height: rowH,
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.52rem",
                          lineHeight: `${rowH}px`,
                          borderTop: onHour ? "1px solid rgba(255,255,255,0.08)" : "none",
                          paddingRight: 6,
                          textAlign: "right",
                        }}
                      >
                        {onHour ? clockLabel(slot) : ""}
                      </span>
                      {courts.map((c, ci) => {
                        const st = stateOf(c.id, c.sport, slot);
                        const first = ci === 0 || courts[ci - 1].sport !== c.sport;
                        const common: CSSProperties = {
                          height: rowH,
                          background: FILL[st],
                          borderTop: `1px solid rgba(255,255,255,${onHour ? 0.08 : 0.025})`,
                          borderLeft: `1px solid rgba(255,255,255,${first ? 0.1 : 0.03})`,
                          display: "block",
                        };
                        if (st === "free") {
                          return (
                            <a
                              key={c.id}
                              href={BOOK_COURTS_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="xcal-free"
                              style={common}
                              title={`${c.name} · ${clockLabel(slot)} — free. Sign in to book it.`}
                              aria-label={`Book ${c.name} at ${clockLabel(slot)}`}
                            />
                          );
                        }
                        return (
                          <span
                            key={c.id}
                            style={{ ...common, borderStyle: st === "shut" ? "dashed" : "solid" }}
                            title={
                              st === "booking" ? `${c.name} · ${clockLabel(slot)} — booked`
                                : st === "programme" ? `${c.name} · ${clockLabel(slot)} — academy or coaching`
                                  : st === "shut" ? `${c.sport} is not bookable on this day yet`
                                    : `${clockLabel(slot)} has passed`
                            }
                          />
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            {allShut && (
              <p className="text-white/60 mt-2.5" style={{ fontSize: "0.68rem" }}>
                {shown.length === 1
                  ? `${shown[0].sport} opens for booking ${SPORT_BOOKING_OPENS_LABEL[shown[0].sport] ?? "shortly"}.`
                  : "None of these courts can be booked on this day yet."}{" "}
                Hours already committed are still shown.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-white/45" style={{ fontSize: "0.55rem" }}>
              {([
                ["free to book", FILL.free, "solid"],
                ["booked", FILL.booking, "solid"],
                ["academy or coaching", FILL.programme, "solid"],
                ["not bookable yet", FILL.shut, "dashed"],
              ] as const).map(([label, bg, bs]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block"
                    style={{ width: 11, height: 11, background: bg, border: `1px ${bs} rgba(255,255,255,0.22)` }}
                  />
                  {label}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setAllHours((v) => !v)}
                className="text-mono text-white/50 hover:text-white transition-colors"
                style={{ fontSize: "0.52rem", borderBottom: "1px solid rgba(255,255,255,0.25)" }}
              >
                {allHours ? "Afternoon and evening" : "Show every hour"}
              </button>
            </div>

            <p className="text-white/35 mt-3" style={{ fontSize: "0.62rem" }}>
              Tap any free slot to sign in and book it on app.orangish.io. The club is open
              round the clock; this opens on the afternoon and evening, plus any hour that is
              already committed.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
