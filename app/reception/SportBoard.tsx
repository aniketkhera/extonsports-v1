"use client";

import type { CSSProperties } from "react";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND, BAND_STAMP } from "../components/ScreenChrome";
import ScreenStamp from "../components/ScreenStamp";
import { BG, INK, RULE_SOFT, BOX } from "../components/tv-palette";
import { useCourtPanels, PANEL_BOX, PanelTitle, NowArea, ComingUp } from "./ReceptionBoard";

/* ONE SPORT'S SCREEN — the badminton and cricket TVs (2026-10-28).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, adding a VIZIO by the badminton courts and a Fire TV by the cricket lanes:
   "For badminton, for now, show only the badminton schedule, for cricket, show only
   the cricket schedule. Show a mockup first for both."

   The reception board's box for that one sport, not a new design: the same title,
   ON NOW / UP NEXT and COMING UP (PanelTitle, NowArea and ComingUp in
   ReceptionBoard.tsx), the same feed and merging, the same header and booking band,
   and the OFF COURT countdown, because these sets face the players.

   WHAT ONE SPORT CHANGES IS THE ROOM. Reception gives a sport a third of the width
   and stacks COMING UP under the NOW area, so the NOW area has ~430-530px of height
   at 1080p. Here the box has the whole width, so the two sit SIDE BY SIDE and each
   gets the box's full height, and the box is drawn SCALE times larger: these are
   read from the court, not from the desk.

   SCALED BY --vw/--vh. Every size in the board's parts is calc(N * var(--vw)), so the
   box redefines --vw and --vh for everything inside it and nothing below needs to
   know. It restates BOX's own expressions (tv-palette) times SCALE rather than
   referring to the inherited value, because a custom property cannot refer to
   itself. The header and the band stay at the board's size, outside the box. */
const SCALE = 1.6;

const SCALED = {
  "--vw": `calc(${SCALE} * min(1vw, calc(1vh * 16 / 9)))`,
  "--vh": `calc(${SCALE} * min(1vh, calc(1vw * 9 / 16)))`,
} as CSSProperties;

/* Thirteen COMING UP rows, not reception's ten: beside the NOW area the list has the
   box's full height, 697px at 1080p, and a row at SCALE 1.6 is 46px, so thirteen and
   the heading come to ~645px (measured 2026-10-28). A fourteenth would be clipped.
   Two in UP NEXT, as on reception. */
const UPCOMING_COUNT = 13;
const UP_NEXT_MAX = 2;

export type BoardSport = "Badminton" | "Cricket";

export default function SportBoard({ sport }: { sport: BoardSport }) {
  useReloadOnDeploy();
  /* No heartbeat here: TvScreen.tsx beats once per page, named by the TV. */
  const { panels, today, stale } = useCourtPanels({ upcoming: UPCOMING_COUNT, upNextMax: UP_NEXT_MAX, nudges: true });
  const p = panels.find((x) => x.sport === sport);

  return (
    <div style={{ position: "absolute", inset: 0, background: BG }}>
    <div
      style={{
        ...BOX,
        position: "absolute", background: BG, color: INK,
        width: "calc(100 * var(--vw))", height: "calc(100 * var(--vh))",
        left: "calc(50% - 50 * var(--vw))", top: "calc(50% - 50 * var(--vh))",
        display: "flex", flexDirection: "column", padding: `calc(2.7 * var(--vh)) calc(2.2 * var(--vw)) calc(${BAND_GAP} + ${BOOK_BAND})`,
        overflow: "hidden",
      }}
    >
      <ScreenHeader stale={stale} />

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {p && (
          <div style={{ ...PANEL_BOX, ...SCALED, flex: 1, minHeight: 0 }}>
            <PanelTitle p={p} />
            <div
              style={{
                flex: 1, minHeight: 0, display: "grid",
                /* Even halves, 862px each at 1080p. The NOW column's widest row is CCCA's
                   lockup with its JUNIOR COACHING tag, 798px (measured 2026-10-28): at
                   0.85 : 1 the column was 792px and CCCA's name broke onto a third line.
                   Next widest: the boxes plus "COURTS 1, 2 · NEXT GROUP AT 7:30 PM",
                   754px, and "OFF COURT IN 10 MIN", 730px. The list takes what is left,
                   so its holders are what truncate. */
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gridTemplateRows: "minmax(0, 1fr)",
                gap: "calc(1.2 * var(--vw))",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                <NowArea p={p} today={today} />
              </div>
              {/* The rule moves from above the list to beside it. */}
              <ComingUp
                p={p} today={today}
                style={{ borderTop: "none", borderLeft: `1px solid ${RULE_SOFT}`, paddingTop: 0, paddingLeft: "calc(1.2 * var(--vw))", minHeight: 0, overflow: "hidden" }}
              />
            </div>
          </div>
        )}
      </div>

      <BookingBand stamp={<ScreenStamp style={BAND_STAMP} />} />
    </div>
    </div>
  );
}
