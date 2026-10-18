/* Shared guts of the two in-club screens.
   ──────────────────────────────────────────────────────────────────────────
   There are two now: /board (the 75" vestibule screen, one row per court) and
   /reception (the 55" at the desk, grouped by sport with partner logos, added
   2026-10-07). They draw completely different layouts from exactly the same
   feed, so the LAYOUT stays in each component and everything below — the key
   handoff, club-local time, and the naming rules — lives here once.

   Extracted rather than copied deliberately: the holder rules in particular
   must never diverge between two screens hanging twenty feet apart. */
import type { CourtSlots, SlotBlock, CourtRef } from "../api/court-slots/route";
import { CLUB_TZ } from "../../lib/opening";

/** The keyed feed returns the same shape plus a holder per block, and — for a
 *  partner's hours — which kind of session it is (2026-10-14). */
export type NamedBlock = SlotBlock & { who?: string; org?: BrandKey; session?: SessionKey };
/** `lights` is keyed-feed only, and only for a club whose lights are automated
 *  (2026-10-18) — see lightChip below. The public proxy never forwards it. */
export type NamedSlots = Omit<CourtSlots, "blocks"> & { blocks: NamedBlock[]; lights?: Lights };

/** One court's row on /board — see courtRow. */
export type Row = {
  court: CourtRef;
  /** The middle column: on court now, else the first booking ahead (UP NEXT);
   *  null when nothing is on court and nothing is still to come today or tomorrow. */
  first: NamedBlock | null;
  /** True when `first` is on court now (ON NOW) rather than still to come (UP NEXT). */
  firstIsNow: boolean;
  firstIsTomorrow: boolean;
  /** The last column, AFTER THAT: the booking after `first`. */
  then: NamedBlock | null;
  thenIsTomorrow: boolean;
};

export const PLATFORM = "https://app.orangish.io";

/* ── THE SCREEN KEY ───────────────────────────────────────────────────────────
   Without a key a screen shows a court, a time and one of two words off the
   public /api/court-slots proxy. WITH one it reads
   app.orangish.io/api/public/court-board, which also says WHO holds each court
   and answers 401 to anybody who does not have the key.

   The key arrives in the URL FRAGMENT, which browsers never send to a server
   and which therefore never lands in a Vercel access log or a Referer header.
   It is stashed in localStorage and wiped from the address bar immediately, so
   it survives the self-reload on deploy; tv-keeper relaunches the full URL
   every ten minutes regardless, so the worst case after a cleared profile is
   ten minutes of a screen with no names. */
const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
const KEY_STORE = "exton-board-key";

export function readKey(): string | null {
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

/** Minutes from club-local midnight, and the club-local date, for an instant. */
export function clubNow(at: Date): { date: string; minutes: number } {
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
export function clock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 || 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** "5:30 – 6:30 PM", with the meridiem printed once when both ends share it. */
export function span(from: number, to: number): string {
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
/* ⛔ kindLabel() IS NO LONGER A FALLBACK, and nothing calls it as of
   2026-10-08: holderLabel answers for every block now — a partner's name, or
   PRIVATE. Kept because an UNKEYED screen (no board_screens token) still has
   nothing but the kind to print, and that is the state /board ships in before
   anyone pairs it. */
export function kindLabel(kind: SlotBlock["kind"]): string {
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
/* ⛔ WHETHER A MEMBER IS NAMED IS NOT THIS FILE'S DECISION, 2026-10-09. The
   platform redacts per screen (board_screens.names_visible), so:

     reception  — behind the desk, where staff answer "who has court 2 at
                  eight?". The feed carries names and this prints them.
     vestibule  — the airlock anybody walks through. Its feed carries the four
                  partner organisations and NOTHING else, so `who` is absent
                  and this prints PRIVATE.

   That is deliberately a server-side split: the vestibule's payload never
   contains a name, which matters because its token sits in a config file on a
   box in a cupboard. A page-level flag would have shipped the names and asked
   the screen not to draw them. A screen with no key at all never had names.

   PARTNER_TEXT is the fallback for a screen that draws text rather than a
   lockup — /board's rows — and for a brand whose mark has not been drawn. */
export const PARTNER_TEXT: Record<BrandKey, string> = {
  "philadelphia-badminton": "PHILADELPHIA BADMINTON",
  ccca: "CHESTER COUNTY CRICKET ACADEMY",
  squashtigers: "SQUASHTIGERS",
  sera: "SERA DANCE & FITNESS",
};

export function holderLabel(b: NamedBlock): string {
  const brand = brandFor(b);
  if (brand) return PARTNER_TEXT[brand];
  const who = (b.who || "").trim();
  return who ? who.toUpperCase() : "PRIVATE";
}

/* ── WHICH PARTNER HOLDS THIS HOUR ────────────────────────────────────────────
   Matched on the holder STRING, which is not where this belongs long term —
   the platform should return a stable brand key next to `who`, resolved from
   the event or squad row in lib/court-holders.ts. Until it does, this is the
   only signal the feed carries.

   Written to fail SOFT: an unrecognised holder returns null and the screen
   prints the name as text, which is exactly what /board already does. So a
   renamed academy costs a logo, never a blank panel.

   ⚠️ The patterns are deliberately loose (substring, case-insensitive) because
   the source strings come from events.name and squad_programs.name, which are
   typed by hand in the admin and have already varied — "Philadelphia Badminton"
   and "Philadelphia Badminton Academy" are both in the data. */
export type BrandKey = "philadelphia-badminton" | "ccca" | "squashtigers" | "sera";

/* ── WHAT KIND OF SESSION (2026-10-14) ───────────────────────────────────────────
   Aniket: with Philadelphia Badminton's hours, "also write if its JUNIOR COACHING
   or OPEN PLAY" — then the same day, every Chester County Cricket Academy and
   SquashTigers hour is junior coaching too. The platform decides which
   (lib/court-partners.ts, from his timetable) and splits PBA's blocks where one
   becomes the other, so Wednesday's 5:30-9:30 arrives as 5:30-7:30 junior
   coaching and 7:30-9:30 open play. This
   file only prints it. A closed vocabulary of two, read through sessionOf so an
   unknown value prints nothing rather than whatever the feed happened to send.
   Both feeds carry it since 2026-10-14 — the keyed one, and the public proxy
   (app/api/court-slots), whose allow-list passes the same two words.

   A THIRD WORD, 2026-10-15: 'free-girls-class', CCCA's free Girls-Only hour. It is
   booked on CCCA's account like any of their lanes but not billed, and Aniket wants
   it to read exactly "Only Girls – Free Coaching" on every Exton screen (renamed from "FREE Girls-Only
   Class" the same day, at his request) — so unlike the
   other two it is mixed case, and the screens that print it set textTransform
   'none' against .text-cond. It also differs in kind: the other two describe a
   partner's hour, this one NAMES it, so /board prints it in place of the partner
   (boardLabel) and nothing joins it to a neighbour (joinSessions). */
export type SessionKey = "junior-coaching" | "open-play" | "free-girls-class";

export const SESSION_TEXT: Record<SessionKey, string> = {
  "junior-coaching": "JUNIOR COACHING",
  "open-play": "OPEN PLAY",
  "free-girls-class": "Only Girls – Free Coaching",
};

/* The other half of the split, for the screens that print no session — /board and
   extonsports.com/calendar. Without it "Next" on /board shows the same partner's
   second half, and the calendar draws the partner's mark twice in one evening.
   Only the same partner, back to back, with DIFFERENT sessions is joined, so two
   members' consecutive hours never merge.

   ⛔ NEVER ACROSS THE FREE GIRLS' HOUR (2026-10-15). It sits right before CCCA's
   own 10:00-12:00 on a Saturday, same partner, different session — exactly the
   shape this joins — and joined, 9-10 would vanish into a "9 AM - 12 PM CCCA"
   block on /board and the calendar, the one hour the owner asked to see named. */
export function joinSessions<T extends NamedBlock>(bs: T[]): T[] {
  const out: T[] = [];
  for (const b of [...bs].sort((a, c) => a.date.localeCompare(c.date) || a.courtId.localeCompare(c.courtId) || a.from - c.from)) {
    const p = out[out.length - 1];
    if (
      p && p.date === b.date && p.courtId === b.courtId && p.to === b.from && p.kind === b.kind &&
      p.org && p.org === b.org && p.who === b.who &&
      p.session && b.session && p.session !== b.session &&
      p.session !== "free-girls-class" && b.session !== "free-girls-class"
    ) {
      out[out.length - 1] = { ...p, to: b.to, session: undefined };
    } else out.push(b);
  }
  return out;
}

/* The free girls' word only on an hour the feed also keys to CCCA (2026-10-15).
   The platform is built to send it on nothing else, so this should never bite; it
   is here so that if a feed ever mislabels a block, the result is a plain holder
   with no tag — never the free girls' label printed over somebody's own hire.
   Keyed on `org` alone, never on the `who` string, for the reason brandFor gives
   below. */
export function sessionOf(b: NamedBlock): SessionKey | null {
  if (b.session === "junior-coaching" || b.session === "open-play") return b.session;
  if (b.session === "free-girls-class" && b.org === "ccca") return b.session;
  return null;
}

/* /board's single line under the time (2026-10-15). Its rows print no session, so
   the free girls' hour would otherwise read as CCCA's name like any of their lanes;
   for that one session the label replaces the partner. Everything else is
   holderLabel, unchanged. */
export function boardLabel(b: NamedBlock): string {
  const s = sessionOf(b);
  return s === "free-girls-class" ? SESSION_TEXT[s] : holderLabel(b);
}

/* ⛔ PREFER THE FEED'S KEY, AND NEVER MATCH A PERSON'S NAME. `org` is resolved
   in the platform from the event or squad row (lib/court-partners.ts) and is a
   closed vocabulary of four — what this file's own comment above asked for.

   The string matcher stays underneath it, but ONLY for a programme block. The
   reason is that `org` is absent in two different situations — "not a partner"
   and "this deployment predates partner keys" — and nothing in the payload
   tells them apart, so a bare `b.org ?? brandOf(b.who)` would keep matching
   for ever. On the keyed television feed `who` for a court hire is the
   MEMBER'S OWN NAME, so that version would hang a partner's logo on a member
   called Kasera or Serafina. Caught in review, 2026-10-09.

   By lib/court-holders.ts's contract a programme label is an organisation, a
   programme or a coach — never the name of whoever hired the court. */
export function brandFor(b: { org?: BrandKey; who?: string; kind?: SlotBlock["kind"] }): BrandKey | null {
  if (b.org) return b.org;
  return b.kind === "programme" ? brandOf(b.who) : null;
}

export function brandOf(who: string | undefined): BrandKey | null {
  const s = (who || "").toLowerCase();
  if (!s) return null;
  if (s.includes("philadelphia") || s.includes("phila badminton")) return "philadelphia-badminton";
  if (s.includes("chester county") || s.includes("cricket academy")) return "ccca";
  if (s.includes("squashtigers") || s.includes("squash tigers")) return "squashtigers";
  /* Squads at Exton are run by SquashTigers, so a programme block naming a
     squad carries their mark even when the string is just the squad's name
     ("Junior Squad", "Elite Squad"). Confirmed by Aniket 2026-10-07. */
  if (s.includes("squad")) return "squashtigers";
  /* The studio's classes are labelled by the CLASS ("Bollywood Fitness"), not
     by the studio, so the class name routes here too. Not 'dance' on its own:
     a session the club runs itself must not inherit a partner's mark. */
  if (s.includes("sera") || s.includes("bollywood")) return "sera";
  return null;
}

/* UP NEXT, for a sport with nobody on court (2026-10-16).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, at the reception screen: "instead of showing ALL OPEN, show UP NEXT so
   that there is always one booking always shown. At the bottom, we can show AFTER
   THAT." So when `now` is empty the earliest booking ahead moves up into the big
   area, and the list under it carries on from the one after.

   EVERYTHING STARTING AT THAT SAME MOMENT goes up together, not just the first
   entry: two different people starting on two courts at 5 PM are both "next", and
   leaving one in the list would print it under AFTER THAT at the same time as the
   one above it. Capped at `max` (the screen passes 2): the big area has room for
   the UP NEXT line plus two entries with the big court boxes, not three. A third
   simultaneous start stays at the top of the list, which is the honest order.

   Nothing on court and nothing ahead returns no UP NEXT, and the screen falls back
   to ALL OPEN. Anything on court returns no UP NEXT either: the big area is for
   what is happening, and what comes after it is the list's job, as before. */
export function splitUpNext<T extends { date: string; from: number }>(
  now: readonly unknown[],
  ahead: readonly T[],
  max: number,
): { upNext: T[]; rest: T[] } {
  if (now.length || !ahead.length || max < 1) return { upNext: [], rest: [...ahead] };
  // The earliest start, not ahead[0]: callers sort, but this must not depend on it.
  const first = ahead.reduce((a, b) =>
    b.date < a.date || (b.date === a.date && b.from < a.from) ? b : a,
  );
  const upNext: T[] = [];
  const rest: T[] = [];
  for (const e of ahead) {
    if (e.date === first.date && e.from === first.from && upNext.length < max) upNext.push(e);
    else rest.push(e);
  }
  return { upNext, rest };
}

/* ONE COURT'S ROW ON /board (2026-10-16).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, of the vestibule, after the same change on /reception: "do the same on
   the vestibule /board". Reception's version: "instead of showing ALL OPEN, show UP
   NEXT so that there is always one booking always shown", then "change up next to
   on now when the timing of the event matches the current time", and the "N OF 3
   FREE NOW" status off as "not neccessary.. just what's next, and what's upcoming".

   So a row is two bookings, not a status and a booking. The middle column is what
   is on court now (ON NOW) or, if nothing is, the first booking still to come (UP
   NEXT) — where it used to say OPEN. The last column is the booking after that one
   either way, which is why it can be headed AFTER THAT for every row. OPEN is left
   only for a court with nothing on court and nothing still to come today or
   tomorrow — which can be one that was played on earlier today.

   The window is today and tomorrow, as it always was here: the keyed feed asks for
   two days, and "TOMORROW" is the only day word this board prints. `blocks` must be
   this court's alone, already through joinSessions. */
export function courtRow(
  court: CourtRef,
  blocks: readonly NamedBlock[],
  today: string,
  tomorrow: string | undefined,
  minutes: number,
): Row {
  const byStart = (a: NamedBlock, b: NamedBlock) => a.from - b.from;
  const todays = blocks.filter((b) => b.date === today).sort(byStart);
  const onNow = todays.find((b) => b.from <= minutes && minutes < b.to) ?? null;
  const ahead: { b: NamedBlock; tomorrow: boolean }[] = [
    ...todays.filter((b) => b.from > minutes).map((b) => ({ b, tomorrow: false })),
    ...(tomorrow ? blocks.filter((b) => b.date === tomorrow).sort(byStart) : []).map((b) => ({ b, tomorrow: true })),
  ];
  const [first, then] = onNow ? [{ b: onNow, tomorrow: false }, ahead[0]] : [ahead[0], ahead[1]];
  return {
    court,
    first: first?.b ?? null,
    firstIsNow: Boolean(onNow),
    firstIsTomorrow: first?.tomorrow ?? false,
    then: then?.b ?? null,
    thenIsTomorrow: then?.tomorrow ?? false,
  };
}

/* The object beside each sport's name on both in-club screens (2026-10-16).
   ──────────────────────────────────────────────────────────────────────────
   Aniket asked for "a caricature of someone playing" each sport; cartoon players
   were mocked and turned down — "need more classy.. maybe just a shuttle, a
   cricket ball and a squash ball - tastefully done with shadow and depth". These
   are those three, drawn as SVG with one light from the upper left and a soft
   shadow on a ground line drawn at 76% of each image's height, which each screen
   puts on its text baseline (see the placement notes in ReceptionBoard.tsx and
   board.css).

   ⚠️ NO GREEN IN THEM: green on both boards means a court is free, and a green
   object beside a sport name would read as status. Nor SESSION_GOLD as a colour of
   its own — the squash ball's two small dots are the only yellow, there because a
   double-yellow-dot ball has them. A sport not listed here simply has no object. */
export const SPORT_OBJECT: Record<string, string> = {
  Badminton: "/reception/shuttle.svg",
  Cricket: "/reception/cricket-ball.svg",
  Squash: "/reception/squash-ball.svg",
};

/* ── THE LIGHTS CHIP (2026-10-18) ─────────────────────────────────────────────
   Aniket, approving the mock-up on the reception screen: "yes on the light chip".
   One chip at the right of a sport's title, ALWAYS shown for a sport whose court
   lights the platform switches (locations.features.auto_lights — badminton only at
   Exton today), in one of four states: LIGHTS ON, LIGHTS OFF IN n MIN, LIGHTS ON IN
   n MIN, LIGHTS OFF. This decides which; ReceptionBoard only draws it.

   WHAT THE FEED CARRIES. The keyed court-board feed gains `lights`, present only
   when the club has automated lights: the on-windows the platform's
   lighting_windows() computes (the same bookings, lead-in and grace as the
   lighting_desired_state the box actually follows — 15 min before a booking to 15
   min after it, gaps of up to 30 min kept lit), and the bridge's own last report —
   what it last transmitted successfully, and any staff override — stamped with the
   SERVER's clock when it arrived, never the box's. The public proxy re-shapes its
   payload and never forwards `lights`, so the unkeyed page, and a sport whose
   lights are not wired yet, draws no chip at all.

   ⚠️ IT SAYS WHAT WE BELIEVE, NOT WHAT IS LIT. The last hop (the RM4 to the
   receiver) is radio with no feedback: on 2026-10-10 a paid booking played 43
   minutes in the dark while every log said "transmitted". `on` from the bridge
   means "last sent successfully". Nothing here can do better until the lights can
   report back; do not word the chip as if it could.

   THE ORDER OF AUTHORITY:
     1. A staff override on a FRESH report decides outright. The bridge obeys an
        override over the calendar, so the calendar would be the wrong answer.
        On or off, never a countdown: an override is a staff decision, not a
        booking, and its end is not something to count down to on a lobby wall.
     2. Otherwise a fresh report's own belief — except within SETTLE_MS of a
        calendar transition (a window opening or closing, or an override running
        out), where the calendar decides. The bridge acts on a change within its
        30 s pass, but the TV polls every 60 s, so for up to ~90 s after one the
        newest report the TV holds still carries the OLD state; without this the
        chip would say LIGHTS OFF at the moment the lights came on.
     3. No report, or a stale one, and the calendar decides. A stale report
        describes a box that has stopped telling us anything; what the platform
        has asked for is the better guess, and the bridge re-asserts it every five
        minutes when it is alive.

   ⛔ NEVER GREEN, on the chip or in its bulb — green on this board means a court is
   free — and never SESSION_GOLD, the girls' tag. The colours live with the drawing
   in ReceptionBoard.

   Written to fail SOFT: anything malformed in `lights` is skipped, never thrown.
   This runs inside the render of a screen nobody is watching. */
export type LightWindow = { zone: string; on_at: string; off_at: string };
export type LightBridgeZone = {
  zone: string;
  /** What the bridge last transmitted successfully; null when it does not know. */
  on: boolean | null;
  override: null | { on: boolean; until: string };
};
export type Lights = {
  /** Lower-case sport names, from locations.features.auto_lights. */
  sports: string[];
  /** Server time when the feed was computed. */
  now: string;
  /** Merged on-windows per sport zone, covering [now − 1 h, now + 24 h]. */
  windows: LightWindow[];
  bridge: null | {
    /** SERVER-stamped time of the bridge's last report. */
    reported_at: string;
    zones: LightBridgeZone[];
  };
};
export type LightChip =
  | { kind: "on" }
  | { kind: "offIn"; min: number }
  | { kind: "onIn"; min: number }
  | { kind: "off" };

const MINUTE = 60_000;
/** A report older than this is a box that has stopped reporting (it reports every 30 s pass). */
const BRIDGE_FRESH_MS = 3 * MINUTE;
/** After a calendar transition, the calendar decides for this long — see 2. above. */
const SETTLE_MS = 2 * MINUTE;
/** LIGHTS OFF IN n MIN for the last quarter hour of a window (its court grace). */
const OFF_SOON_MS = 15 * MINUTE;
/** LIGHTS ON IN n MIN when the next window opens within half an hour. */
const ON_SOON_MS = 30 * MINUTE;

const instant = (s: unknown): number => (typeof s === "string" ? Date.parse(s) : NaN);

export function lightChip(sport: string, lights: Lights | undefined, nowMs: number): LightChip | null {
  if (!lights || !Array.isArray(lights.sports)) return null;
  const zone = sport.toLowerCase();
  if (!lights.sports.some((s) => typeof s === "string" && s.toLowerCase() === zone)) return null;

  /* This zone's windows, re-merged here although the platform already merges
     them: two overlapping windows arriving unmerged would otherwise count down to
     the end of the first one — LIGHTS OFF IN 5 MIN over a court that stays lit. */
  const spans: { on: number; off: number }[] = [];
  for (const w of (Array.isArray(lights.windows) ? lights.windows : [])
    .filter((x) => x && typeof x.zone === "string" && x.zone.toLowerCase() === zone)
    .map((x) => ({ on: instant(x.on_at), off: instant(x.off_at) }))
    .filter((x) => Number.isFinite(x.on) && Number.isFinite(x.off) && x.on < x.off)
    .sort((a, b) => a.on - b.on)) {
    const last = spans[spans.length - 1];
    if (last && w.on <= last.off) last.off = Math.max(last.off, w.off);
    else spans.push({ ...w });
  }
  const cur = spans.find((w) => w.on <= nowMs && nowMs < w.off);
  const next = spans.find((w) => w.on > nowMs); // sorted, so the first is the earliest

  const bridge = lights.bridge;
  const reported = bridge ? instant(bridge.reported_at) : NaN;
  const fresh = Number.isFinite(reported) && nowMs - reported <= BRIDGE_FRESH_MS;
  const z = fresh && Array.isArray(bridge?.zones)
    ? bridge.zones.find((x) => x && typeof x.zone === "string" && x.zone.toLowerCase() === zone)
    : undefined;

  const override = z?.override;
  const until = override ? instant(override.until) : NaN;
  if (override && typeof override.on === "boolean" && until > nowMs) {
    return { kind: override.on ? "on" : "off" };
  }

  /* An override running out counts as a transition too (2026-10-18, beyond the
     brief): the bridge drops an expired override on its next pass and goes back to
     the calendar (lighting-only.js), so for the same ~90 s its last report still
     carries the override's state. */
  const settling = (t: number) => t <= nowMs && nowMs - t <= SETTLE_MS;
  const justChanged = settling(until) || spans.some((w) => settling(w.on) || settling(w.off));
  const lit = z && typeof z.on === "boolean" && !justChanged ? z.on : Boolean(cur);

  if (lit && cur && cur.off - nowMs <= OFF_SOON_MS) {
    return { kind: "offIn", min: Math.ceil((cur.off - nowMs) / MINUTE) };
  }
  if (lit) return { kind: "on" };
  if (next && next.on - nowMs <= ON_SOON_MS) {
    return { kind: "onIn", min: Math.ceil((next.on - nowMs) / MINUTE) };
  }
  return { kind: "off" };
}
