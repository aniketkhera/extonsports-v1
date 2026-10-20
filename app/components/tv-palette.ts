import type { CSSProperties } from "react";

/* ── THE TV PALETTE ───────────────────────────────────────────────────────────
   Shared by the screens drawn in React — /reception and, from 2026-10-20, /exit,
   the promotion screen by the exit door. Moved here from
   app/reception/ReceptionBoard.tsx on 2026-10-20 unchanged, when /exit took the
   same header and booking band (components/ScreenChrome.tsx): one palette for
   both, so tuning a colour cannot leave the two screens' strips disagreeing.

   Brighter than the web palette, deliberately, and kept here as one block so
   it can be tuned in one place.

   Aniket read the first build from across the lobby on 2026-10-07 and called
   it dull. Two causes, both fixed here:

   1. MOST OF THE TEXT WAS TRANSLUCENT. Nine different alpha whites between
      0.045 and 0.78. On a 55" panel a few metres away anything under about
      0.75 stops reading as white and starts reading as grey — the labels and
      the NEXT lines were the worst of it. They are near-opaque now, and the
      hierarchy is carried by SIZE instead, which survives distance.
   2. THE ORANGE WAS NOT THE BRAND ORANGE. It was #f26b3a, a darker and more
      saturated colour than globals.css's --color-ember (#F89B72). EMBER below
      is brighter again than even --color-ember-hi (#FBB28C).

   ⚠️ LITERALS, NOT TOKENS — same rule as board.css and comingsoon.module.css.
   The site's light theme redefines --color-* under :root[data-theme="light"],
   and from 2026-10-07 light is the DEFAULT. A screen built on tokens would
   have turned into dark text on a dark ground with nobody in the room. */
export const BG = "#0B1623";
export const INK = "#FFFFFF";
/** Brighter than --color-ember-hi; the header, the clock and brand accents. */
export const EMBER = "#FFBE97";
/** Brighter than --color-green-hi (#5CC766) — "open" has to carry the room. */
export const GREEN = "#79EA92";
export const LABEL = "rgba(255,255,255,0.86)";
export const NEXT_VAL = "rgba(255,255,255,0.88)";
export const NEXT_LBL = "rgba(255,255,255,0.62)";
export const MUTED = "rgba(255,255,255,0.70)";
export const RULE = "rgba(255,255,255,0.34)";
export const RULE_SOFT = "rgba(255,255,255,0.22)";
export const PANEL = "rgba(255,255,255,0.075)";
/** The brand orange at full strength — globals.css's --color-ember, as a literal.
 *  The booking band's address and phone icon; on /reception also the sport boxes'
 *  border and JUNIOR COACHING, which keep their own names there for their own
 *  reasons (PANEL_BORDER, SESSION_ORANGE). */
export const ORANGE = "#F89B72";

/* ── 16:9, ALWAYS (2026-10-18) ──────────────────────────────────────────────
   These screens are drawn for 16:9 televisions, and every size on them was
   viewport-relative — vw for most things, vh for the band and the paddings. On any
   other shape the two drift apart: on a phone held upright vh is 2-3x vw (the QR
   outgrew the band and landed on the phone number), and on a phone held sideways vw
   is large against a short height (the COMING UP list rose over ON NOW). Aniket,
   from his phone: "Not aligned", then "Landscape a bit off too".
   So each screen is ONE 16:9 picture scaled to fit, letterboxed on the ground colour:
   --vw and --vh are a hundredth of the 16:9 box, not of the window, and every size
   is written in them (the conversion was mechanical: Nvw -> N * var(--vw)).
   On a 16:9 screen min() picks 1vw and 1vh exactly, the box IS the window, and the
   televisions render as before — measured pixel for pixel at 1920x1080.
   (Moved here from ReceptionBoard on 2026-10-20 with the palette, for /exit.) */
export const BOX = {
  "--vw": "min(1vw, calc(1vh * 16 / 9))",
  "--vh": "min(1vh, calc(1vw * 9 / 16))",
} as CSSProperties;
