/* A partner's mark for the calendar of bookings, 2026-10-13 — Aniket: "show it on the
   extonsports.com calendar too", after the booking page started showing whose hours are
   whose. The same lockups the reception board and the partner strip draw (PBA's Space
   Grotesk wordmark, the CCCA shield, SQUASH/TIGERS type, the studio's script SeRa),
   shrunk to fit one court column.

   `rows` is how many half-hour rows the block spans on screen. One row (15px) is too
   short for a lockup, so it keeps the short label the calendar always used. Decorative:
   the cell around it carries the partner's full name. */

import type { BrandKey } from "../board/board-lib";

const SHORT: Record<BrandKey, string> = {
  squashtigers: "ST",
  ccca: "CCCA",
  "philadelphia-badminton": "PHILA",
  sera: "SeRa",
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
  return (
    <span aria-hidden style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <span style={{ fontFamily: "var(--font-caveat), cursive", fontWeight: 700, fontSize: "0.9rem", color: ACCENT }}>SeRa</span>
      {rows >= 3 && (
        <span className="text-cond" style={{ fontSize: "0.42rem", letterSpacing: "0.14em", color: FG }}>FITNESS</span>
      )}
    </span>
  );
}
