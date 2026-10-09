"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CLUB_TZ } from "../../lib/opening";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
/* The feed shape, the key handoff, club-local time and the holder-naming rules
   are shared with /reception — see board-lib.ts for why they are not duplicated. */
import {
  PLATFORM, readKey, clubNow, clock, span, holderLabel,
  type NamedBlock, type NamedSlots, type Row,
} from "./board-lib";

/* The court board, as shown on the reception and vestibule televisions.
   ────────────────────────────────────────────────────────────────────────
   One row per court: what is on it now, and what is on it next. Nothing else.
   Somebody standing in the vestibule wants two facts — can I play now, and if
   not, when — and a board that answers those in three seconds beats one that
   shows a whole week nobody can read from fifteen feet away.

   ⛔ NO HEADCOUNTS, NO BOOKING IDS, AND NO FULL NAMES FROM THE UNKEYED FEED.
   This said "NO NAMES" flatly until 2026-10-07. It is no longer true of the
   unkeyed path: /api/court-slots now carries the holder's INITIALS on a
   booking block, because the public calendar wanted them and both surfaces
   share that proxy. That is a widening of what this screen shows when it has
   no key, and it was not asked for here — it is a consequence of the shared
   endpoint, and it is acceptable only because the KEYED feed this screen
   normally runs on already shows full names by design.

   What has NOT changed: if the payload ever grows a FULL name on the unkeyed
   path, do NOT print it — a lobby television is read by everyone who walks
   past, including people the booking holder has never met. `court_bookings.title` is the
   specific trap: titles read like "Jeyaram court hire — Badminton 1", which
   names a customer on a 75-inch screen.

   ⚠️ IT RUNS UNATTENDED FOR WEEKS. tv-keeper on the N95 opens this URL in a
   fullscreen browser and leaves it. So: a failed poll keeps the last good
   board rather than blanking it, "today" is recomputed from the clock on every
   tick rather than taken from days[0] (otherwise the board freezes on the day
   it was opened), and nothing accumulates in state.

   ⚠️ EVERY SIZE IS IN VIEWPORT UNITS, DELIBERATELY. The two screens are a 55"
   and a 75", and whether the browser reports 1920 or 3840 CSS pixels is not
   something we control from here. vh/vw make that irrelevant — the board fills
   whatever it is given and the ten rows always fit. Do not reintroduce px. */

export default function CourtBoard() {
  const [data, setData] = useState<NamedSlots | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  /* Only ever used to decide whether to draw the "no connection" dot. The
     board itself keeps rendering the last good payload, which is why `data`
     is never cleared on failure. */
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);

  /* A deploy must reach the wall without somebody driving to Exton to power-cycle
     a television. Shared with /comingsoon — see the hook. */
  useReloadOnDeploy();

  /* The clock. Fifteen seconds, not sixty: a row flipping from "on now" to the
     next booking up to a minute late is the one error a person standing in
     front of the board would actually notice. */
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  /* The data. Two feeds, picked by whether this screen holds a key — see
     readKey above. The proxy caches for 60s so polling faster buys nothing, and
     the keyed feed is no-store but costs the platform four small reads. */
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
           free" — the second reading would put a lobby screen in the position
           of inviting people onto a court somebody has booked. */
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

  const rows: Row[] = useMemo(() => {
    if (!data || !now) return [];
    const { date: today, minutes } = clubNow(now);
    /* Tomorrow is derived from the payload's own day list rather than by adding
       a day to a Date, so a DST changeover cannot shift it by an hour. */
    const i = data.days.indexOf(today);
    const tomorrow = i >= 0 ? data.days[i + 1] : undefined;

    return data.courts.map((court) => {
      const mine = data.blocks.filter((b) => b.courtId === court.id);
      const todays = mine.filter((b) => b.date === today).sort((a, b) => a.from - b.from);
      const onNow = todays.find((b) => b.from <= minutes && minutes < b.to) ?? null;
      const laterToday = todays.find((b) => b.from > minutes) ?? null;
      if (laterToday) return { court, now: onNow, next: laterToday, nextIsTomorrow: false };
      const firstTomorrow = tomorrow
        ? mine.filter((b) => b.date === tomorrow).sort((a, b) => a.from - b.from)[0] ?? null
        : null;
      return { court, now: onNow, next: firstTomorrow, nextIsTomorrow: Boolean(firstTomorrow) };
    });
  }, [data, now]);

  const stamp = now ? clubNow(now) : null;
  const heading = now
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: CLUB_TZ, weekday: "long", month: "long", day: "numeric",
      }).format(now)
    : "";

  return (
    <div className="board">
      <header className="bhead">
        <div>
          <div className="btitle">EXTON SPORTS CENTER</div>
          <div className="bsub">COURT BOARD{heading ? ` · ${heading.toUpperCase()}` : ""}</div>
        </div>
        <div className="bclock">
          {stamp ? clock(stamp.minutes) : "—"}
          {/* Deliberately small and unlabelled. The board is for members, not
              for diagnosing it; the dot is for whoever walks past and wonders
              why nothing has changed since this morning. */}
          {stale && <span className="bdot" title="not updating" />}
        </div>
      </header>

      <div className="btable">
        <div className="brow bhrow">
          <span>COURT</span>
          <span>ON NOW</span>
          <span>NEXT</span>
        </div>
        {rows.length === 0 ? (
          <div className="bempty">LOADING COURTS…</div>
        ) : (
          rows.map((r) => (
            <div className="brow" key={r.court.id}>
              <span className="bcourt">{r.court.name}</span>
              <span className={r.now ? "bnow" : "bopen"}>
                {r.now ? (
                  <>
                    <b>{span(r.now.from, r.now.to)}</b>
                    <i>{holderLabel(r.now)}</i>
                  </>
                ) : (
                  "OPEN"
                )}
              </span>
              <span className="bnext">
                {r.next ? (
                  <>
                    <b>
                      {r.nextIsTomorrow ? "TOMORROW " : ""}
                      {span(r.next.from, r.next.to)}
                    </b>
                    <i>{holderLabel(r.next)}</i>
                  </>
                ) : (
                  <em>NOTHING BOOKED</em>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <footer className="bfoot">
        <div className="bcta">BOOK A COURT BY THE HOUR</div>
        <div className="bcta2">extonsports.com</div>
      </footer>
    </div>
  );
}
