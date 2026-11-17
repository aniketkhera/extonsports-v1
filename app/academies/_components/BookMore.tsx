"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACADEMY_COPY, bookButton, bookHeading, bookSummary, confirmLine, gridUnavailable, noRate, pickHint,
} from "@/lib/academies/copy";
import {
  WINDOW_ROWS, amountCents, bookBody, rateFor, ratesForDay, stillFits, tapCell, usesOf, windowStart, type BookPick,
} from "@/lib/academies/pick";
import {
  bookDates, clockText, courtName, dayChip, fromSiteDay, rangeText, type CellState, type DayResult, type OverviewView, type Use,
} from "@/lib/academies/view";
import { BTN_PRIMARY, BTN_TEXT, postJson } from "../../my-bookings/_components/ui";
import AddOutcome from "./AddOutcome";
import type { AddApi } from "./useAdd";
import UseSwitch from "./UseSwitch";
import s from "./academies.module.css";

/* "Book more courts" / "Book more lanes", 2026-11-16 (orangish-app docs/academy-page.md D5;
   the mockup's grid). Day chips for today through today + 14, both included (bookDates), PBA's
   Coaching / Open play switch, and the court × half-hour grid of the chosen day from
   POST /api/academies/day — Yours, Free, Taken, Picked. Tapping free cells draws ONE pick (a
   run of half-hours on one or more courts, lib/academies/pick.ts tapCell), summed underneath
   with its total and the confirm line, and one button sends it to the one write.

   THE PRICE IS THE CHOSEN DAY'S (pick.ts ratesForDay): the day's own rates when the platform
   sends them, else the overview's. Where there is no figure at all (CCCA past its season)
   there is no summary and no button, and a line says why (copy.ts noRate).

   A PAGE OPEN PAST MIDNIGHT asks for yesterday, and the platform refuses it ('stale'): this
   asks AcademyView, once per answer, to fetch a new overview. AcademyView keys this component
   on view.today, so the new day remounts it on today's chips — router.refresh() alone would
   keep the old `date` (Next 16 useRouter docs: client state survives a refresh).

   THE GRID IS FETCHED, NOT GUESSED. A day the platform could not give is "We can't show free
   courts right now" with a Try again — never an empty grid, which would read as "all free" or
   "all taken". Loading state is derived from which key the last answer was for (no
   setState in an effect body: react-hooks/set-state-in-effect), and an answer for a day the
   partner has since left is ignored. After a write, AcademyView bumps `refreshKey` and the
   grid is fetched again; a pick that no longer fits it (someone took a cell) is dropped in
   render by stillFits, never sent.

   The window shows WINDOW_ROWS half-hours at a time ("Earlier · Later"), starting a little
   before the partner's own next session (windowStart). */
export default function BookMore({
  view,
  refreshKey,
  add,
  onStale,
}: {
  view: OverviewView;
  refreshKey: number;
  add: AddApi;
  onStale: () => void;
}) {
  const { partner, rates, club } = view;
  const tz = club.timezone;
  const unit = partner.unit;
  const pba = partner.key === "pba";
  const dates = bookDates(view.today, view.windowDays, view.lastDate);

  const [date, setDate] = useState(view.today);
  const [use, setUse] = useState<Use | null>(pba ? (usesOf(rates)[0] ?? null) : null);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; date: string; result: DayResult; start: number } | null>(null);
  const [win, setWin] = useState<{ date: string; start: number } | null>(null);
  const [pick, setPick] = useState<BookPick | null>(null);

  const key = `${date}|${refreshKey}|${retry}`;
  useEffect(() => {
    let live = true;
    const k = `${date}|${refreshKey}|${retry}`;
    postJson("/api/academies/day", { date }).then((r) => {
      if (!live) return;
      const result = fromSiteDay(r.status, r.json, date);
      setLoaded({ key: k, date, result, start: result.status === "ok" ? windowStart(result.day) : 0 });
    });
    return () => {
      live = false;
    };
  }, [date, refreshKey, retry]);

  // One overview fetch per 'stale' answer, never a loop: the ref remembers which answer asked.
  // A new day remounts this component (see the header), which starts the ref afresh.
  const staleAsked = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded || loaded.result.status !== "stale" || staleAsked.current === loaded.key) return;
    staleAsked.current = loaded.key;
    onStale();
  }, [loaded, onStale]);

  const shown = loaded && loaded.date === date ? loaded : null;
  const loading = !loaded || loaded.key !== key;
  const day = shown?.result.status === "ok" ? shown.result.day : null;
  const livePick = day ? stillFits(day, pick) : null;
  const rows = day?.slots.length ?? 0;
  const start = Math.max(0, Math.min(win && win.date === date ? win.start : (shown?.start ?? 0), Math.max(0, rows - WINDOW_ROWS)));
  const dayRates = ratesForDay(rates, day);
  const rate = rateFor(dayRates, pba ? use : null);
  const name = (label: string) => courtName(unit, label);

  function chooseDate(d: string) {
    setDate(d);
    setPick(null);
    add.reset();
  }

  function tap(court: number, row: number) {
    if (!day) return;
    setPick(tapCell(day, livePick, court, row));
    add.reset();
  }

  async function press() {
    if (!day || !livePick) return;
    const labels = Object.fromEntries(livePick.courts.map((c) => [day.courts[c].id, name(day.courts[c].label)]));
    const p = livePick;
    const v = await add.submit((requestId) => bookBody(day, p, tz, requestId, partner.key, pba ? use : null), labels);
    if (v.status === "done") setPick(null);
  }

  let grid: React.ReactNode;
  if (!shown) {
    grid = <p className={s.fine}>{ACADEMY_COPY.loading}</p>;
  } else if (!day) {
    const st = shown.result.status;
    grid = (
      <div role="alert">
        <p className="text-white/70 text-[0.92rem] leading-relaxed">
          {st === "off" ? ACADEMY_COPY.off : st === "stale" ? ACADEMY_COPY.staleDay : gridUnavailable(unit)}
        </p>
        {shown.result.status !== "signed_out" && shown.result.status !== "off" && (
          <button type="button" className={`${BTN_TEXT} mt-3`} disabled={loading} onClick={() => setRetry((n) => n + 1)}>
            {loading ? ACADEMY_COPY.loading : ACADEMY_COPY.tryAgain}
          </button>
        )}
      </div>
    );
  } else {
    const visible = day.slots.slice(start, start + WINDOW_ROWS);
    grid = (
      <>
        <p className={s.fine} style={{ marginTop: 0, marginBottom: 6 }}>
          {pickHint(unit)}
        </p>
        <table className={s.grid} aria-busy={loading}>
          <colgroup>
            <col className={s.timeCol} />
            {day.courts.map((c) => (
              <col key={c.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th aria-hidden="true" />
              {day.courts.map((c) => (
                <th key={c.id} scope="col">
                  {name(c.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((slot, i) => {
              const row = start + i;
              const time = clockText(slot.start, tz);
              return (
                <tr key={slot.start}>
                  <td className={s.time}>{time}</td>
                  {slot.cells.map((state, c) => {
                    const picked = !!livePick && livePick.courts.includes(c) && row >= livePick.from && row < livePick.to;
                    return (
                      <td key={day.courts[c].id}>
                        <Cell
                          state={state}
                          picked={picked}
                          label={`${name(day.courts[c].label)}, ${time}`}
                          disabled={add.busy}
                          onTap={() => tap(c, row)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className={s.legend}>
          <span><i className={s.yours} />{ACADEMY_COPY.legendYours}</span>
          <span><i className={s.free} />{ACADEMY_COPY.legendFree}</span>
          <span><i className={s.taken} />{ACADEMY_COPY.legendTaken}</span>
          <span><i className={s.pick} />{ACADEMY_COPY.legendPicked}</span>
        </div>
        {rows > WINDOW_ROWS && (
          <div className="flex gap-4">
            <button
              type="button"
              className={`${s.more} text-mono`}
              disabled={start === 0}
              onClick={() => setWin({ date, start: Math.max(0, start - WINDOW_ROWS) })}
            >
              {ACADEMY_COPY.earlier}
            </button>
            <button
              type="button"
              className={`${s.more} text-mono`}
              disabled={start >= rows - WINDOW_ROWS}
              onClick={() => setWin({ date, start: Math.min(rows - WINDOW_ROWS, start + WINDOW_ROWS) })}
            >
              {ACADEMY_COPY.later}
            </button>
          </div>
        )}
      </>
    );
  }

  let summary: React.ReactNode = null;
  if (day && livePick && rate) {
    const labels = livePick.courts.map((c) => day.courts[c].label);
    const minutes = (livePick.to - livePick.from) * 30;
    const endIso = new Date(Date.parse(day.slots[livePick.to - 1].start) + 30 * 60_000).toISOString();
    const range = rangeText(day.slots[livePick.from].start, endIso, tz);
    const cents = amountCents(rate.centsPerHour, minutes, labels.length);
    const sum = bookSummary(unit, labels, day.date, range, pba ? use : null, minutes, cents, partner.billing);
    summary = (
      <>
        <div className={s.sum}>
          <b>{sum.head}</b>
          <br />
          {sum.tail}
        </div>
        <p className={s.confirm}>{confirmLine(cents)}</p>
        <button type="button" className={`${BTN_PRIMARY} ${s.submit}`} disabled={add.busy} onClick={press}>
          {add.busy ? ACADEMY_COPY.adding : bookButton(unit, labels)}
        </button>
        <button
          type="button"
          className={`${BTN_TEXT} mt-3`}
          disabled={add.busy}
          onClick={() => {
            setPick(null);
            add.reset();
          }}
        >
          {ACADEMY_COPY.clear}
        </button>
      </>
    );
  }

  return (
    <section className={s.section} aria-labelledby="ac-book">
      <h2 id="ac-book" className="text-cond text-white text-[1.4rem] mb-3">
        {bookHeading(unit)}
      </h2>
      <div className={s.days} role="group" aria-label="Day">
        {dates.map((d) => {
          const chip = dayChip(d);
          return (
            <button key={d} type="button" className={s.day} aria-pressed={d === date} onClick={() => chooseDate(d)}>
              <span className={`${s.d1} text-mono`}>{chip.weekday}</span>
              <span className={s.d2}>{chip.day}</span>
            </button>
          );
        })}
      </div>
      {pba && (
        <UseSwitch
          rates={dayRates}
          value={use}
          disabled={add.busy}
          onChange={(u) => {
            setUse(u);
            add.reset();
          }}
        />
      )}
      {grid}
      {summary}
      {!rate && <p className={s.fine}>{noRate(unit)}</p>}
      <AddOutcome outcome={add.outcome} unit={unit} tz={tz} />
      {pba && <p className={s.fine}>{ACADEMY_COPY.discretion}</p>}
    </section>
  );
}

/** One grid cell. Only a free or picked half-hour is a button; the rest are not focusable. */
function Cell({
  state,
  picked,
  label,
  disabled,
  onTap,
}: {
  state: CellState;
  picked: boolean;
  label: string;
  disabled: boolean;
  onTap: () => void;
}) {
  if (picked || state === "free") {
    return (
      <button
        type="button"
        className={`${s.cell} ${picked ? s.pick : s.free}`}
        aria-pressed={picked}
        aria-label={`${label}, ${picked ? ACADEMY_COPY.legendPicked : ACADEMY_COPY.legendFree}`}
        disabled={disabled}
        onClick={onTap}
      >
        {picked ? "✓" : ACADEMY_COPY.legendFree}
      </button>
    );
  }
  if (state === "yours") return <span className={`${s.cell} ${s.yours}`} style={{ lineHeight: "34px" }}>{ACADEMY_COPY.legendYours}</span>;
  if (state === "taken") return <span className={`${s.cell} ${s.taken}`} role="img" aria-label={`${label}, ${ACADEMY_COPY.legendTaken}`} />;
  return <span className={`${s.cell} ${state === "past" ? s.past : s.closed}`} aria-hidden="true" />;
}
