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

/** The keyed feed returns the same shape plus a holder per block. */
export type NamedBlock = SlotBlock & { who?: string; org?: BrandKey };
export type NamedSlots = Omit<CourtSlots, "blocks"> & { blocks: NamedBlock[] };

export type Row = {
  court: CourtRef;
  now: NamedBlock | null;
  next: NamedBlock | null;
  /** True when `next` is on tomorrow rather than today. */
  nextIsTomorrow: boolean;
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
