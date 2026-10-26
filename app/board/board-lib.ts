/* Shared guts of the two in-club screens.
   ──────────────────────────────────────────────────────────────────────────
   There are two now: /board (one row per court) and /reception (grouped by sport
   with partner logos, added 2026-10-07). /board was written for the 75" in the
   vestibule, but that TV shows /reception now, like the 55" at the desk — both
   are on /reception per tv-keeper's own logs (checked 2026-10-20), and /board is
   on no TV today. They draw completely different layouts from exactly the same
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
export type NamedSlots = Omit<CourtSlots, "blocks" | "lights"> & { blocks: NamedBlock[]; lights?: Lights };

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

/* ── THE SCREEN KEY ───────────────────────────────────────────────────────────
   Moved to app/components/screen-key.ts on 2026-10-20 — the heartbeat reads it
   too, and so does /comingsoon, which has no court feed — and memoised there.
   Re-exported so /board and /reception keep importing it from here. The
   reasoning (fragment, localStorage, the hourly relaunch) is with the code. */
export { PLATFORM, readKey } from "../components/screen-key";

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

     reception  — behind the desk. Its key named members until 2026-10-25,
                  when Aniket turned names off on it: players can read that
                  TV from the courts, so it is a public screen too. Which key
                  names anyone is the board_screens row, not this comment.
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
  /* Phoenix, Reshma's throwball team (2026-10-23). The key stays 'throwball'. */
  throwball: "PHOENIX THROWBALL",
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
export type BrandKey = "philadelphia-badminton" | "ccca" | "squashtigers" | "sera" | "throwball";

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
  /* Only a key this file knows (2026-10-23). A screen still on an older bundle when
     the platform starts sending a new key would otherwise index PARTNER_TEXT with
     it and print a blank holder; an unknown key now falls through like no key. */
  if (b.org && b.org in PARTNER_TEXT) return b.org;
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
  /* Reshma's team's Sunday series (2026-10-23). A sport's name, never a person's. */
  if (s.includes("throwball")) return "throwball";
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
     1. A staff override on a FRESH report decides outright — provided the
        report's own belief agrees with it, or has none. The bridge obeys an
        override over the calendar, so the calendar would be the wrong answer.
        On or off, never a countdown: an override is a staff decision, not a
        booking, and its end is not something to count down to on a lobby wall.
        When the belief CONTRADICTS a live override (2026-10-18 review), the
        belief is shown instead, still on or off: the bridge has the override
        but its last successful send was the other state — a transmit that
        failed — and an override nobody sent is a wish, not the room.
     2. Otherwise a fresh report's own belief — except around a calendar
        transition (a window opening or closing, or an override running out),
        where the calendar decides. The bridge acts on a change within its 30 s
        pass, but the TV polls every 60 s, so for up to ~90 s after one the
        newest report the TV holds still carries the OLD state; without this the
        chip would say LIGHTS OFF at the moment the lights came on. "Around" is
        two tests, either enough:
          · within SETTLE_MS of the transition by the TV's clock, and
          · the report was made before the transition + BRIDGE_ACT_MS, by its own
            reported_at. Added 2026-10-18 after review: the first test alone
            counts from the TV's clock, so a poll that failed or ran slow near a
            transition left the TV holding a report from BEFORE it that was
            still fresh once the 2 minutes ran out, and the chip flashed the old
            state. This one compares two server instants (reported_at and the
            window's own on_at/off_at), so neither a late poll nor a skewed TV
            clock can fool it.
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
/** How long after a transition the bridge may take to act on it and report: its
 *  30 s pass plus margin. A report made sooner cannot have seen it — see 2. above. */
const BRIDGE_ACT_MS = 45_000;
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

  /** The report's belief for this zone; null for none, or anything not a boolean. */
  const said = typeof z?.on === "boolean" ? z.on : null;

  const override = z?.override;
  const until = override ? instant(override.until) : NaN;
  if (override && typeof override.on === "boolean" && until > nowMs) {
    /* Agreeing or silent, the override decides; contradicted, the belief does
       (2026-10-18 review — see 1. above). Neither counts down: while an override
       is in force the bridge is not following the calendar. */
    const on = said === null || said === override.on ? override.on : said;
    return { kind: on ? "on" : "off" };
  }

  /* An override running out counts as a transition too (2026-10-18, beyond the
     brief): the bridge drops an expired override on its next pass and goes back to
     the calendar (lighting-only.js), so for the same ~90 s its last report still
     carries the override's state. Both tests (see 2. above) apply only to a
     transition already past: one still ahead is not one a report could have
     missed. `reported` is NaN without a report, so the second test is false
     then — and `said` is null anyway. */
  const settling = (t: number) =>
    t <= nowMs && (nowMs - t <= SETTLE_MS || reported < t + BRIDGE_ACT_MS);
  const justChanged = settling(until) || spans.some((w) => settling(w.on) || settling(w.off));
  const lit = said !== null && !justChanged ? said : Boolean(cur);

  if (lit && cur && cur.off - nowMs <= OFF_SOON_MS) {
    return { kind: "offIn", min: Math.ceil((cur.off - nowMs) / MINUTE) };
  }
  if (lit) return { kind: "on" };
  if (next && next.on - nowMs <= ON_SOON_MS) {
    return { kind: "onIn", min: Math.ceil((next.on - nowMs) / MINUTE) };
  }
  return { kind: "off" };
}

/* ── OFF COURT (2026-10-25) ───────────────────────────────────────────────────
   Aniket: "start nudging 10 mins before the booking ends — OFF COURT in x minutes —
   and count down using seconds the last 3 minutes or so." The harm is back-to-back
   bookings: a group that does not finish on time keeps the next one off the court.
   Driven by the schedule alone; the cameras come later and are not needed for this.
   He chose the reception TV for it, the one players can see from the courts.

   WHAT FOLLOWS DECIDES THE WORDING, per court:
     another party next     OFF COURT IN 7 MIN, then 2:59 … 0:01, then TIME UP held
                            for TIME_UP_HOLD_MS, with "NEXT GROUP AT 7 PM" beside it.
     the same party next    nothing at all.
     the court free after   ENDS IN 7 MIN with "FREE AFTER · EXTEND IN THE APP" — to
                            sell the extension, not to throw people off an idle court.
                            Court hires only: a partner's session that ends onto a free
                            court gets nothing (its coach runs its clock), and minutes
                            only, no seconds, no TIME UP.

   "THE SAME PARTY" (sameParty below) is mostly the platform's call already: it keys
   its runs on the FULL holder before it strips any name, so one member's back-to-back
   hours on a court arrive here as ONE block whose end is the real end, keyed screen or
   not. What is left is where the platform split one holder's run anyway — a partner's
   junior coaching becoming its open play, or midnight — which it marks `continues`,
   plus the same partner on either side of a kind change (CCCA's lane hire then its
   own event), which `org` says. Two strangers back to back are two blocks that share
   neither, keyed or public, so the unkeyed page decides exactly as the TV does.

   "NEXT" MEANS STARTING WITHIN BACK_TO_BACK_MIN of the end. A court is sold by the
   half hour, so a shorter gap is not an extension anyone could book — the group is
   in the way of the next one either way.

   THE TIMES ARE THE TRUE ONES: exactFrom / exactTo where the platform sent them
   (Sunday throwball is 18:15–19:45, which the grid calls 18:00–20:00), so the
   countdown runs to 7:45 and the next group is announced at 6:15, not 6.

   ⛔ NEVER A NAME. Nothing here prints `who`; the countdown replaces a booking's TIME,
   never its holder, and the holder line is whatever the screen's key already allows.
   ⛔ NEVER GREEN — green on these boards means a court is free. */

/* WHICH ROW A BLOCK JOINS when /reception and /vestibule cut a sport's blocks into
   time bands (mergeBlocks in ReceptionBoard.tsx): its holder and session — and, for a
   holder with NO name, its own run as well (2026-10-25).

   "PRIVATE" is not a holder, it is every unnamed person at once. Keyed on the label
   alone, two strangers were one holder: two private hires 5–6 on court 2 and 5:30–6:30
   on court 4 came out as three rows, the middle one "5:30 – 6 PM, courts 2 and 4", and
   two strangers back to back on ONE court were stitched into a single "5 – 7 PM" row.
   Harmless-looking until the OFF COURT countdown, which hangs off a row's end: the
   first put "ENDS IN 8 MIN" over court 4, which runs to 6:30, and the second swallowed
   the nudge altogether, because no row ended at 6. Seen on the mock-up, 2026-10-25.

   With the run in the key, each unnamed booking is its own row unless another has the
   very same hours (then one row with both courts, as before). A NAMED holder or a
   partner is keyed exactly as it always was, so the slicing that keeps one holder's
   changing court set honest (see mergeBlocks) is unchanged. */
export function bandKey(b: NamedBlock): string {
  const anon = !brandFor(b) && !(b.who || "").trim();
  return `${sessionOf(b) ?? ""}|${holderLabel(b)}${anon ? `|${b.from}-${b.to}` : ""}`;
}

/** The nudge starts this long before an end. */
export const NUDGE_LEAD_MS = 10 * MINUTE;
/** Inside this, OFF COURT counts in m:ss. */
export const NUDGE_SECONDS_MS = 3 * MINUTE;
/** TIME UP stays up this long after an end that another party is waiting on. Five
 *  minutes, Aniket's choice over two when he approved the mock-up (2026-10-25): longer
 *  pressure on a group that is slow to leave. */
export const TIME_UP_HOLD_MS = 5 * MINUTE;
/** A next party starting within this many minutes of an end makes it "next". */
export const BACK_TO_BACK_MIN = 30;

/** A block's true start and end, in its own day's minutes — see THE TIMES above. */
export const startOf = (b: NamedBlock): number => b.exactFrom ?? b.from;
export const endOf = (b: NamedBlock): number => b.exactTo ?? b.to;

export type Nudge = {
  courtId: string;
  /** "next": another party starts within BACK_TO_BACK_MIN — OFF COURT. "free": the softer line. */
  kind: "next" | "free";
  /** The block whose end this counts down to. */
  block: NamedBlock;
  /** Its true end, in minutes from TODAY's club-local midnight. */
  end: number;
  /** "next" only: the next party's true start, in the same minutes (past 1440 after midnight). */
  nextAt?: number;
};

/** One holder either side? The same partner, or — on a keyed screen — the same holder
 *  text. A partner and a non-partner, or two different partners, are never one. */
export function sameParty(a: NamedBlock, b: NamedBlock): boolean {
  const pa = brandFor(a), pb = brandFor(b);
  if (pa || pb) return pa === pb;
  const wa = (a.who || "").trim(), wb = (b.who || "").trim();
  return wa !== "" && wa === wb;
}

/** The club-local date after a YYYY-MM-DD one, by UTC noon so no zone can shift it. */
function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1, 12));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/* Which courts are nudging right now, and how. `nowMin` is minutes from today's
   club-local midnight WITH the seconds as a fraction (14:07:30 is 847.5).

   A block is a candidate from a little before NUDGE_LEAD_MS out (the screen
   recomputes this on a 15 s tick, so it is asked early and nudgeFace decides the
   second it shows), until its end — or, when another party is next, until
   TIME_UP_HOLD_MS after it. It must have started: nothing counts down to the end of
   a booking that has not begun. */
export function courtNudges(blocks: readonly NamedBlock[], today: string, nowMin: number): Nudge[] {
  const tomorrow = nextDay(today);
  /** A block's minute on the today-relative axis; NaN for any other day. */
  const rel = (b: NamedBlock, m: number) => (b.date === today ? m : b.date === tomorrow ? m + 1440 : NaN);
  const lead = NUDGE_LEAD_MS / MINUTE + 0.5;
  const hold = TIME_UP_HOLD_MS / MINUTE;

  const byCourt = new Map<string, NamedBlock[]>();
  for (const b of blocks) {
    if (b.date !== today && b.date !== tomorrow) continue;
    const list = byCourt.get(b.courtId);
    if (list) list.push(b);
    else byCourt.set(b.courtId, [b]);
  }

  const out: Nudge[] = [];
  for (const [courtId, list] of byCourt) {
    for (const b of list) {
      if (b.date !== today) continue;
      const end = endOf(b);
      if (startOf(b) > nowMin || end - nowMin > lead || nowMin >= end + hold) continue;
      if (b.continues) continue; // the platform says this holder carries on

      // The first block on this court that is still going after `end` and starts
      // inside BACK_TO_BACK_MIN of it.
      let next: NamedBlock | null = null;
      let nextAt = Infinity;
      for (const n of list) {
        if (n === b) continue;
        const s = rel(n, startOf(n)), e = rel(n, endOf(n));
        if (!(e > end) || !(s < end + BACK_TO_BACK_MIN)) continue;
        if (s < nextAt) { next = n; nextAt = s; }
      }

      if (next) {
        if (sameParty(b, next)) continue;
        /* Never earlier than the end: a block that overlaps this one is somebody already
           on the court, and "NEXT GROUP AT 5 PM" at 5:55 would be nonsense. */
        out.push({ courtId, kind: "next", block: b, end, nextAt: Math.max(nextAt, end) });
      } else if (nowMin < end && b.kind === "booking" && !brandFor(b)) {
        out.push({ courtId, kind: "free", block: b, end });
      }
    }
  }
  return out;
}

/** What the countdown shows this second. */
export type NudgeFace =
  | { kind: "none" }
  | { kind: "offIn"; min: number }
  | { kind: "offSec"; clock: string }
  | { kind: "timeUp" }
  | { kind: "endsIn"; min: number };

/* The face for `remainingMs` until the end. Minutes are rounded UP, so the first
   reading at T-10:00 is 10 MIN and nothing ever reads 0 MIN; the seconds take over AT
   three minutes ("3:00"), so 3 MIN is never shown — 4 MIN covers 3:00–4:00 exactly.
   Past the end "next" holds TIME UP for as long as courtNudges still returns it; the
   hold is its decision, not this one's, so a slow tick can only lengthen TIME UP by a
   moment, never flash the booking's time back up. "free" just stops. */
export function nudgeFace(kind: Nudge["kind"], remainingMs: number): NudgeFace {
  if (remainingMs > NUDGE_LEAD_MS) return { kind: "none" };
  if (kind === "free") {
    return remainingMs > 0 ? { kind: "endsIn", min: Math.ceil(remainingMs / MINUTE) } : { kind: "none" };
  }
  if (remainingMs <= 0) return { kind: "timeUp" };
  if (remainingMs > NUDGE_SECONDS_MS) return { kind: "offIn", min: Math.ceil(remainingMs / MINUTE) };
  const s = Math.ceil(remainingMs / 1000);
  return { kind: "offSec", clock: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` };
}

/* The instant of minute `minute` of TODAY (club-local), from the instant `nowMs`. Taken
   relative to the club's wall clock now, and the seconds from `nowMs` itself — the
   club's offset from UTC is whole minutes. Good for the minutes around now, which is
   all a countdown asks; across a DST change in the same night it would be an hour out,
   at 2 AM, for one night a year. */
export function clubInstant(minute: number, nowMs: number): number {
  const { minutes } = clubNow(new Date(nowMs));
  const intoMinute = ((nowMs % MINUTE) + MINUTE) % MINUTE;
  return nowMs - intoMinute + (minute - minutes) * MINUTE;
}
