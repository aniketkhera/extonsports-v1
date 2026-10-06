"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CourtSlots, SlotBlock, CourtRef } from "../api/court-slots/route";

/** The keyed feed returns the same shape plus a holder per block. */
type NamedBlock = SlotBlock & { who?: string };
type NamedSlots = Omit<CourtSlots, "blocks"> & { blocks: NamedBlock[] };
import { CLUB_TZ } from "../../lib/opening";
import useReloadOnDeploy from "../components/useReloadOnDeploy";

/* The court board, as shown on the reception and vestibule televisions.
   ────────────────────────────────────────────────────────────────────────
   One row per court: what is on it now, and what is on it next. Nothing else.
   Somebody standing in the vestibule wants two facts — can I play now, and if
   not, when — and a board that answers those in three seconds beats one that
   shows a whole week nobody can read from fifteen feet away.

   ⛔ NO NAMES, NO HEADCOUNTS, NO BOOKING IDS. Same rule as the door screen and
   the public calendar, and here it costs nothing to keep: /api/court-slots
   returns a court, a time and one of two words ('booking' or 'programme'), and
   that is all this file receives. If the payload ever grows a name, do NOT
   print it — a lobby television is read by everyone who walks past, including
   people the booking holder has never met. `court_bookings.title` is the
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

/* ── THE SCREEN KEY ───────────────────────────────────────────────────────────
   Without a key this board shows exactly what it always has: a court, a time and
   one of two words, off the public /api/court-slots proxy. WITH one it reads
   app.orangish.io/api/public/court-board instead, which also says WHO holds each
   court — and which answers 401 to anybody who does not have the key.

   The two feeds are separate endpoints on purpose, not one endpoint with a flag.
   extonsports.com/calendar renders the public one and is a link Aniket emails to
   a mailing list (and Google indexes it at priority 0.8); a flag on a shared
   endpoint is one forgotten parameter away from publishing members' names to
   that list. Two routes cannot make that mistake.

   The key arrives in the URL FRAGMENT, which browsers never send to a server and
   which therefore never lands in a Vercel access log or a Referer header. Same
   handoff the door-screen kiosk uses. It is stashed in localStorage and wiped
   from the address bar immediately, so it survives the self-reload on deploy;
   tv-keeper relaunches the full URL every ten minutes regardless, so the worst
   case after a cleared profile is ten minutes of a board with no names. */
const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
const KEY_STORE = "exton-board-key";
const PLATFORM = "https://app.orangish.io";

function readKey(): string | null {
  try {
    const m = /(?:^#|&)k=([A-Za-z0-9_-]{43})(?:&|$)/.exec(window.location.hash);
    if (m) {
      try { window.localStorage.setItem(KEY_STORE, m[1]); } catch { /* private mode: memory only */ }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return m[1];
    }
  } catch { /* fall through to storage */ }
  try {
    const k = window.localStorage.getItem(KEY_STORE);
    return k && KEY_RE.test(k) ? k : null;
  } catch {
    return null;
  }
}

type Row = {
  court: CourtRef;
  now: NamedBlock | null;
  next: NamedBlock | null;
  /** True when `next` is on tomorrow rather than today. */
  nextIsTomorrow: boolean;
};

/** Minutes from club-local midnight, and the club-local date, for an instant. */
function clubNow(at: Date): { date: string; minutes: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: (Number(p.hour) % 24) * 60 + Number(p.minute),
  };
}

/* 12-hour, uppercase, no leading zero — the way a clock in a lobby reads.
   Kept separate from the booking API's own 24-hour HH:MM for the same reason
   BookingsCalendar keeps the two apart: one is for people, one is for URLs. */
function clock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 || 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** "5:30 – 6:30 PM", with the meridiem printed once when both ends share it. */
function span(from: number, to: number): string {
  const a = clock(from);
  const b = clock(to);
  const am = a.slice(-2);
  return am === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/* WHAT A BLOCK IS CALLED. Two words is all the endpoint gives, and it is
   enough: the row already names the court, so repeating the sport would be
   noise. "COURT HIRE" is somebody who paid for the floor; "COACHING" is a
   squad, an academy session or a lesson — the same wording the public
   calendar's legend uses, so the two never read as different things. */
function kindLabel(kind: SlotBlock["kind"]): string {
  return kind === "booking" ? "COURT HIRE" : "COACHING";
}

/* The small line under each time: WHO holds the court, when this screen is
   allowed to know, and otherwise what kind of block it is.

   The name replaces the kind rather than joining it. "Junior Squad" already
   reads as coaching and "Rohitha K" already reads as a hire, so printing both
   would spend a second line saying what the first one said. Uppercased to match
   every other label on the board, not to shout.

   ⛔ WHATEVER ARRIVES IN `who` IS PRINTED. The rules about what may be in it —
   a programme name for a squad so no child is ever named, the coach rather than
   the student for a lesson, 'Reserved' for anyone under 18 — all live server
   side in the platform's lib/court-holders.ts, which is the only place they can
   be enforced. Do not add a second set of rules here; add them there. */
function holderLabel(b: NamedBlock): string {
  const who = (b.who || "").trim();
  return who ? who.toUpperCase() : kindLabel(b.kind);
}

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
