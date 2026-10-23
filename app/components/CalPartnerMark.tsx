/* A partner's mark for the calendar of bookings, 2026-10-13 — Aniket: "show it on the
   extonsports.com calendar too", after the booking page started showing whose hours are
   whose. The same lockups the reception board and the partner strip draw (PBA's Space
   Grotesk wordmark, the CCCA shield, SQUASH/TIGERS type, the studio's script SeRa),
   shrunk to fit one court column.

   `rows` is how many half-hour rows the block spans on screen. One row (15px) is too
   short for a lockup, so it keeps the short label the calendar always used. Decorative:
   the cell around it carries the partner's full name. */

import { SESSION_TEXT, type BrandKey } from "../board/board-lib";

/* CCCA's free girls' hour in one 15px row, 2026-10-15. The full words do not fit a
   court column at that height, and this is the part that still says what it is; the
   cell's tooltip, its aria-label and the legend carry "Only Girls – Free Coaching" whole.
   "Only Girls" since the rename (2026-10-15): the same ten characters as "FREE Girls"
   was, so it fits wherever that did. */
export const FREE_GIRLS_SHORT = "Only Girls";

const SHORT: Record<BrandKey, string> = {
  squashtigers: "ST",
  ccca: "CCCA",
  "philadelphia-badminton": "PHILA",
  sera: "SeRa",
  throwball: "Throwball",
};

const FG = "rgba(var(--cal-fg),0.92)";
const ACCENT = "var(--ember-ink)";

export default function CalPartnerMark({ org, rows }: { org: BrandKey; rows: number }) {
  if (rows < 2) {
    return <span style={{ fontSize: "0.5rem", letterSpacing: "0.02em", color: FG }}>{SHORT[org]}</span>;
  }
  if (org === "philadelphia-badminton") {
    return (
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700,
          fontSize: "0.56rem", lineHeight: 1.05, letterSpacing: "-0.02em",
        }}
      >
        <span style={{ display: "block", color: ACCENT }}>Phila</span>
        <span style={{ display: "block", color: FG }}>Badminton</span>
      </span>
    );
  }
  if (org === "ccca") {
    return (
      <span aria-hidden style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/academies/ccca-shield.png" alt="" width={360} height={239} style={{ height: 14, width: "auto", display: "block" }} />
        <span className="text-cond" style={{ fontSize: "0.52rem", letterSpacing: "0.06em", color: FG }}>CCCA</span>
      </span>
    );
  }
  if (org === "squashtigers") {
    return (
      <span aria-hidden className="text-cond" style={{ fontSize: "0.56rem", letterSpacing: "0.04em", lineHeight: 1.05 }}>
        <span style={{ display: "block", color: FG }}>Squash</span>
        <span style={{ display: "block", color: ACCENT }}>Tigers</span>
      </span>
    );
  }
  if (org === "sera") {
    return (
      <span aria-hidden style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
        <span style={{ fontFamily: "var(--font-caveat), cursive", fontWeight: 700, fontSize: "0.9rem", color: ACCENT }}>SeRa</span>
        {rows >= 3 && (
          <span className="text-cond" style={{ fontSize: "0.42rem", letterSpacing: "0.14em", color: FG }}>FITNESS</span>
        )}
      </span>
    );
  }
  /* No artwork: the name in type (Throwball, 2026-10-23). This was the Sera branch's
     fall-through until then, so a new key would have worn the studio's mark. Mixed
     case as the owner wrote it: textTransform 'none' against .text-cond's capitals,
     the same rule CalFreeMark follows below. */
  return (
    <span aria-hidden className="text-cond" style={{ fontSize: "0.56rem", letterSpacing: "0.04em", color: FG, textTransform: "none" }}>
      {SHORT[org]}
    </span>
  );
}

/* In place of CCCA's shield on their free girls' hour (2026-10-15). With two rows
   or more — the hour is two — the exact words, allowed to wrap; one row gets the
   short form. Never .text-cond, which would uppercase what the owner asked to read
   exactly. The name before the dash ("Only Girls") in the accent, the rest after
   it, so the part that differs from every other CCCA hour is what the eye lands on. Decorative, like the marks above: the
   cell around it carries the full label for a screen reader. */
export function CalFreeMark({ rows }: { rows: number }) {
  if (rows < 2) {
    return <span style={{ fontSize: "0.5rem", letterSpacing: "0.02em", color: FG }}>{FREE_GIRLS_SHORT}</span>;
  }
  const [first, ...rest] = SESSION_TEXT["free-girls-class"].split(" – ");
  return (
    <span aria-hidden style={{ fontSize: "0.52rem", fontWeight: 600, lineHeight: 1.05, color: FG, padding: "0 2px" }}>
      <span style={{ color: ACCENT }}>{first}</span>{rest.length ? ` – ${rest.join(" – ")}` : ""}
    </span>
  );
}
