"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTick } from "../components/ticker";
import { BookingBand, secondTicker } from "../components/ScreenChrome";
import { ComingUp, type Panel } from "./ReceptionBoard";
import { drawnOffers, panelFace, type Line, type PanelFace, type Qr, type Tone } from "../board/extend-feed";
import styles from "./ExtendPanel.module.css";

/* THE EXTEND PANEL — the badminton TV's offer to extend a booking that is ending
   (2026-11-03; orangish-app docs/court-extend.md §10).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-02: "At 1:50pm, on the badminton TV, we start flashing — 'Booking
   ending in x minutes. Do you wish to extend?' … Under that, show two QR codes — extend
   by 30 mins, extend by 1 hour … Keep this on till 5 mins past the booking."

   WHERE. In the COMING UP cell, which it replaces while an offer is drawn and gives back
   afterwards (§10.3). The NOW column is untouched apart from its entry's note. The
   band's small booking QR hides while it is up (ExtendBand), as on /exit: never three
   codes on the wall, and a phone lifted at the TV scans an extension, not a booking.

   WHAT. Four layouts, the SERVER's choice (§10.4): `one` (one court, two codes);
   `multi` (one booker with several courts: a price table and two codes, the courts
   unticked on the phone — decision 1); `cards` (two bookings, a card each); and
   `cards-one-code` (three bookings, one code each and the length picked on the phone —
   decision 3, because six codes shrink to ~7 cm and stop scanning from the court). The
   words are extend-feed.ts panelFace's; this file only lays them out. A length that is
   no longer for sale on a committed offer (Q15's second scan, Q8's joinable Checkout)
   is drawn as its reason, with no code and no price.

   EVERY SIZE IS THE APPROVED MOCK-UP'S (inject-b.js), in this box's units: the panel
   sits inside PANEL_BOX at SportBoard's SCALE 1.6, where one --vw is 30.72px at 1080p,
   so N = mock px ÷ 30.72 (§10.4's table). Remeasured on this component by
   scripts/tv-fit — re-run it on any change here, to the code text, to SportBoard's
   SCALE or to BookingBand.

   COLOURS ARE LITERALS, as everywhere on these screens (tv-palette.ts): the panel's own
   navy and orange from the mock-ups, and OFF COURT's red only from an open offer's end
   to its close — never before the end, never while someone pays. ⛔ Never GREEN, which
   on this board means a free court.

   THE CODES are path data from the platform (§10.7): this site has no QR library and
   gains none. Dark #0B1220 on white with the measured 2-module quiet zone, crisp edges,
   sized by width only, and never inside a transform or an animation. */

const vw = (n: number) => `calc(${n} * var(--vw))`;

const GROUND = "#141C2B";
const ACCENT = "#FF8A4C";
const ACCENT_INK = "#111111";
const PEACH = "#F7B48E";
const QUIET = "#A9B1BF";
const WHITE = "#FFFFFF";
/** OFF COURT's red (ReceptionBoard), for an open offer between its end and its close. */
const ALARM = "#FF5B45";
const QR_DARK = "#0B1220";
const TILE_GROUND = "rgba(255,255,255,0.05)";
const TILE_EDGE = "rgba(255,255,255,0.14)";
const TABLE_RULE = "rgba(255,255,255,0.12)";

/** Each layout's code side, in N (§10.4): the largest each measured panel holds. */
const QR_SIDE = { one: 7.68, multi: 6.67, cards: 4.88, "cards-one-code": 5.21 } as const;

const nowrap: CSSProperties = { whiteSpace: "nowrap" };
const tile: CSSProperties = {
  background: TILE_GROUND, border: `${vw(0.065)} solid ${TILE_EDGE}`, borderRadius: vw(0.46), minWidth: 0,
};

function QrCode({ qr, side }: { qr: Qr; side: number }) {
  return (
    <div style={{ flex: "none", background: WHITE, borderRadius: vw(0.33), padding: vw(0.2), lineHeight: 0 }}>
      <svg
        viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" aria-hidden
        style={{ display: "block", width: vw(side), height: vw(side) }}
      >
        <rect width={qr.size} height={qr.size} fill={WHITE} />
        <path d={qr.d} fill={QR_DARK} />
      </svg>
    </div>
  );
}

function Chip({ text, tone }: { text: string; tone: Tone }) {
  return (
    <div
      style={{
        ...nowrap, flex: "none", fontSize: vw(0.98), letterSpacing: "0.08em", fontWeight: 700,
        padding: `${vw(0.13)} ${vw(0.59)}`, borderRadius: vw(1),
        background: tone === "red" ? ALARM : ACCENT, color: tone === "red" ? WHITE : ACCENT_INK,
      }}
    >
      {text}
    </div>
  );
}

function H1({ text, tone }: { text: string; tone: Tone }) {
  return <div style={{ ...nowrap, fontSize: vw(2.02), lineHeight: 1, color: tone === "red" ? ALARM : PEACH }}>{text}</div>;
}

/** The sub-head: "Do you wish to extend?", "Keep playing on Court 3?", PAYMENT IN
 *  PROGRESS (white — not green, not red), or the red face's "Scan now …". */
function H2({ line }: { line: Line }) {
  return (
    <div style={{ ...nowrap, fontSize: vw(1.5), lineHeight: 1.05, color: WHITE }}>
      {line.text}
      {line.accent && <span style={{ color: ACCENT }}>{line.accent}</span>}
      {line.tail}
    </div>
  );
}

function Top({ chip, h1, tone }: { chip?: string; h1: string; tone: Tone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: vw(0.59), ...nowrap }}>
      {chip && <Chip text={chip} tone={tone} />}
      <H1 text={h1} tone={tone} />
    </div>
  );
}

function Body({ face }: { face: PanelFace }) {
  switch (face.layout) {
    case "one":
      return (
        <>
          <Top chip={face.chip} h1={face.h1} tone={face.tone} />
          <H2 line={face.h2} />
          <div style={{ display: "flex", gap: vw(0.85), flex: 1, minHeight: 0 }}>
            {face.tiles.map((t) => (
              <div
                key={t.key}
                style={{
                  ...tile, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: vw(0.2), textAlign: "center", padding: vw(0.46),
                }}
              >
                {t.qr && <QrCode qr={t.qr} side={QR_SIDE.one} />}
                <div style={{ ...nowrap, fontSize: vw(1.17), lineHeight: 1, letterSpacing: "0.03em", marginTop: vw(0.26) }}>{t.what}</div>
                {t.qr ? (
                  <>
                    <div style={{ ...nowrap, fontSize: vw(0.85), lineHeight: 1.1, color: QUIET }}>{t.when}</div>
                    <div style={{ ...nowrap, fontSize: vw(t.agreed ? 1.43 : 1.89), lineHeight: 1, color: ACCENT }}>{t.price}</div>
                  </>
                ) : (
                  /* Not for sale: the reason, no code and no price. */
                  <div style={{ ...nowrap, fontSize: vw(1.04), lineHeight: 1.1, color: QUIET }}>{t.why}</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ ...nowrap, fontSize: vw(0.81), color: QUIET }}>{face.foot}</div>
        </>
      );

    case "multi":
      return (
        <>
          <Top chip={face.chip} h1={face.h1} tone={face.tone} />
          <H2 line={face.h2} />
          {face.heads ? (
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: vw(1.11) }}>
              <thead>
                <tr>
                  <th />
                  {face.heads.map((h) => (
                    <th key={h} style={{ ...nowrap, fontWeight: 400, fontSize: vw(0.81), color: QUIET, textAlign: "right", padding: `0 ${vw(0.33)} ${vw(0.13)}`, letterSpacing: "0.03em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {face.rows.map((r) => (
                  <tr key={r.n}>
                    <td style={{ ...nowrap, textAlign: "left", padding: `${vw(0.1)} ${vw(0.33)}`, borderTop: `${vw(0.033)} solid ${TABLE_RULE}` }}>{r.n}</td>
                    {r.cells.map((c, i) => (
                      <td
                        key={i}
                        style={{
                          ...nowrap, textAlign: "right", padding: `${vw(0.1)} ${vw(0.33)}`, borderTop: `${vw(0.033)} solid ${TABLE_RULE}`,
                          ...("price" in c ? { color: ACCENT } : { color: QUIET, fontSize: vw(0.75) }),
                        }}
                      >
                        {"price" in c ? c.price : c.why}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ ...nowrap, fontSize: vw(1.11), color: ACCENT }}>{face.agreed}</div>
          )}
          <div style={{ display: "flex", gap: vw(0.72) }}>
            {face.codes.map((c) => (
              <div key={c.key} style={{ ...tile, flex: 1, display: "flex", gap: vw(0.52), alignItems: "center", padding: `${vw(0.33)} ${vw(0.46)}` }}>
                {c.qr && <QrCode qr={c.qr} side={QR_SIDE.multi} />}
                <div style={{ display: "flex", flexDirection: "column", gap: vw(0.1), minWidth: 0 }}>
                  <div style={{ ...nowrap, fontSize: vw(1.01), lineHeight: 1, letterSpacing: "0.03em" }}>{c.what}</div>
                  {c.lines.map((l) => (
                    <div key={l} style={{ ...nowrap, fontSize: vw(0.72), lineHeight: 1.1, color: QUIET }}>{l}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      );

    case "cards":
      return (
        <>
          <Top h1={face.h1} tone={face.tone} />
          <H2 line={face.h2} />
          {face.cards.map((c) => (
            <div key={c.key} style={{ ...tile, display: "flex", flexDirection: "column", gap: vw(0.2), padding: `${vw(0.26)} ${vw(0.52)} ${vw(0.33)}`, minHeight: 0 }}>
              <div style={{ ...nowrap, fontSize: vw(1.04), lineHeight: 1 }}>
                {c.name}
                <span style={{ fontSize: vw(0.72), color: c.paying ? WHITE : QUIET }}> · {c.small}</span>
              </div>
              <div style={{ display: "flex", gap: vw(1.3) }}>
                {c.opts.map((o) => (
                  <div key={o.key} style={{ display: "flex", gap: vw(0.46), alignItems: "center", minWidth: 0 }}>
                    {o.qr && <QrCode qr={o.qr} side={QR_SIDE.cards} />}
                    <div style={{ display: "flex", flexDirection: "column", gap: vw(0.1), minWidth: 0 }}>
                      <div style={{ ...nowrap, fontSize: vw(0.91), lineHeight: 1, letterSpacing: "0.03em" }}>{o.what}</div>
                      {o.qr ? (
                        <>
                          <div style={{ ...nowrap, fontSize: vw(o.agreed ? 0.91 : 1.43), lineHeight: 1, color: ACCENT }}>{o.price}</div>
                          <div style={{ ...nowrap, fontSize: vw(0.68), lineHeight: 1.1, color: QUIET }}>{o.when}</div>
                        </>
                      ) : (
                        <div style={{ ...nowrap, fontSize: vw(0.68), lineHeight: 1.1, color: QUIET }}>{o.why}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      );

    case "cards-one-code":
      return (
        <>
          <Top h1={face.h1} tone={face.tone} />
          {face.cards.map((c) => (
            <div key={c.key} style={{ ...tile, flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: vw(0.72), padding: `${vw(0.33)} ${vw(0.52)}` }}>
              <QrCode qr={c.qr} side={QR_SIDE["cards-one-code"]} />
              <div style={{ display: "flex", flexDirection: "column", gap: vw(0.26), minWidth: 0 }}>
                <div style={{ ...nowrap, fontSize: vw(1.04), lineHeight: 1 }}>
                  {c.name}
                  <span style={{ fontSize: vw(0.72), color: QUIET }}> · {c.small}</span>
                </div>
                <div style={{ ...nowrap, fontSize: vw(1.43), lineHeight: 1, color: ACCENT }}>
                  {c.prices
                    ? c.prices.map((p, i) => (
                      <span key={p.what}>
                        {i > 0 && "   "}
                        <span style={{ fontSize: vw(0.85), color: WHITE, letterSpacing: "0.04em" }}>{p.what}</span> {p.price}
                      </span>
                    ))
                    : "AGREED RATE"}
                </div>
                <div style={{ ...nowrap, fontSize: vw(0.75), lineHeight: 1.1, color: c.paying ? WHITE : QUIET }}>{c.line}</div>
              </div>
            </div>
          ))}
        </>
      );
  }
}

/** The panel itself, filling the COMING UP cell. The pulsing glow is a sibling overlay
 *  (ExtendPanel.module.css), so nothing that holds a code ever animates. */
export function ExtendPanelView({ face }: { face: PanelFace }) {
  const red = face.tone === "red";
  const edge = red ? ALARM : ACCENT;
  const glow = red ? "rgba(255,91,69,0.45)" : "rgba(255,138,76,0.45)";
  return (
    <div data-extend-panel={face.layout} style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      <div
        style={{
          flex: 1, minHeight: 0, boxSizing: "border-box", overflow: "hidden",
          display: "flex", flexDirection: "column", gap: vw(0.46),
          padding: `${vw(0.59)} ${vw(0.85)} ${vw(0.65)}`, borderRadius: vw(0.59),
          background: GROUND, border: `${vw(0.13)} solid ${edge}`,
          boxShadow: `0 0 0 ${vw(0.2)} ${red ? "rgba(255,91,69,0.18)" : "rgba(255,138,76,0.18)"}, inset 0 0 ${vw(1.3)} ${red ? "rgba(255,91,69,0.10)" : "rgba(255,138,76,0.10)"}`,
          fontFamily: "var(--font-cond)", fontWeight: 400, color: WHITE,
        }}
      >
        <Body face={face} />
      </div>
      <div
        aria-hidden
        className={styles.pulse}
        style={{ position: "absolute", inset: 0, borderRadius: vw(0.59), boxShadow: `0 0 ${vw(1.56)} ${vw(0.33)} ${glow}`, pointerEvents: "none" }}
      />
    </div>
  );
}

const nounOf = (sport: string) => (sport === "Cricket" ? "LANE" : "COURT");

/** The COMING UP cell on a screen with offers: the panel while one is drawn, the list
 *  otherwise. Re-drawn every second on the header clock's ticker, so the minutes, the
 *  turn to red at the end and the close at end + 5 land on the clock's own second — and
 *  only this cell re-renders, never the board's grouping. */
export function ExtendCell({ p, today, stale, style }: { p: Panel; today: string; stale: boolean; style?: CSSProperties }) {
  const ms = useTick(secondTicker);
  const x = p.extend;
  const face = x && ms ? panelFace(drawnOffers(x.view, ms, stale), ms, (id) => x.label[id] ?? "", nounOf(p.sport)) : null;
  if (!face) return <ComingUp p={p} today={today} style={style} />;
  return <ExtendPanelView face={face} />;
}

/** The booking band, without its small QR while the panel is up (§10.3). */
export function ExtendBand({ p, stale, stamp }: { p: Panel | undefined; stale: boolean; stamp?: ReactNode }) {
  const ms = useTick(secondTicker);
  const up = !!(p?.extend && ms && drawnOffers(p.extend.view, ms, stale).length);
  return <BookingBand showBookQr={!up} stamp={stamp} />;
}
