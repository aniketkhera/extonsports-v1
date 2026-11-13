import type { CSSProperties } from "react";
import { BOOK_QR } from "../components/ScreenChrome";
import { INK, ORANGE, RULE_SOFT } from "../components/tv-palette";

/* THE MUSIC QR ON THE BADMINTON TV (2026-11-13).
   ──────────────────────────────────────────────
   Aniket, 2026-11-12: "on the badminton TV, can we have a QR code to control the music —
   turn it on/off/change songs etc — the person scanning the QR is then able to change it",
   then "just that one speaker only" (the Main Door Sonos), then, told the speaker page is
   already open to anyone: "yes, just point the QR to the open page".

   So this is a STATIC code for MUSIC_URL — the same address the site already publishes
   (next.config.ts redirects /music to the speaker-control page on the club box, which is
   public through Tailscale Funnel with no login, a 1.5 s per-client and 30/min overall
   limit, and volume capped at 50). The code adds no access that the address did not
   already give anyone who knew it; it hands the address to everyone in the hall. A
   rotating, time-limited code was designed and part-built the same night (local branches
   feat/tv-music in orangish-app, feat/speaker-control in orangish-cameras,
   feat/tv-music-tile here) and stopped in favour of this. If the public page is ever
   closed, this code dies with it: the redirect is the one place to change.

   WHERE. In the booking band's free run between the orangish.io pill and the booking line
   (BookingBand's `music` slot), at the booking QR's size (BOOK_QR) so the two line up.
   Never with the extend panel up: ExtendBand drops it on the same second and the same test
   (drawnOffers) that drops the band's booking QR, so while a booking is ending the only
   codes on the wall are the extension's (ExtendPanel.tsx: never three codes on the wall).
   Its own label, at the far end of the left track from the booking line's "or scan",
   because two codes in one band are the coin toss BookingBand's comment warns about.

   THE IMAGE. public/reception/music-qr.svg is GENERATED from MUSIC_URL — python segno,
   version 3 (29 modules), error level Q (asked for M; segno boosts the level when the
   version has room, which buys glare tolerance at no cost in size), 4-module quiet zone,
   dark #0B1623 on white, like every other code on these screens. Change one, regenerate
   the other: the SVG's <title> carries the URL and the test checks they agree. 37 units in
   BOOK_QR's square is ~2.0 CSS px a module at 1280x720 — larger than the booking code's
   41 units in the same square. Never inside a transform or an animation.

   On the public, unkeyed /badminton (a browser, not the TV) it is a link, like the booking
   QR beside it: nobody can scan a code on their own phone's screen. */

/** The page the code opens. extonsports.com/music → the club box's speaker page. */
export const MUSIC_URL = "https://extonsports.com/music";

const vw = (n: number) => `calc(${n} * var(--vw))`;
const vh = (n: number) => `calc(${n} * var(--vh))`;

/** The square's right edge, measured from the band's left edge in the band's own --vw
 *  (the 16:9 box; the band is outside SportBoard's SCALE). Measured by scripts/tv-fit on
 *  2026-11-13, at 1280x720@1.5 and 1920x1080@1 alike: the orangish.io pill ends at
 *  14.1vw and the booking line starts at 26.1vw, an 11.95vw run. The tile is ~10.2vw
 *  (label ~3.8 + gap 0.5 + the 5.85vw square), so 25.1 centres it with ~0.8–1vw of air
 *  either side. A first cut at 24.5 with a 0.95vw label ran 8–10 px into the pill. */
const TILE_END = 25.1;

/* Review, 2026-11-13: the code sits ~1vw from "For bookings, go to extonsports.com or scan",
   and at 2.0 px a module it resolves from further away than the booking code (1.83), so the
   band could read as a booking sentence with a code on each side — and a phone's preview chip
   for this code says "extonsports.com", the booking line's own domain. Three things keep it
   grouped with its own words: the label is white, not the band's muted grey, with MUSIC in
   the band's orange; a hairline rule (the band's own RULE_SOFT) stands in the air between the
   code and the booking line; and the label is the first thing the eye meets, left of the code. */
const label: CSSProperties = {
  fontWeight: 600, letterSpacing: "0.06em", lineHeight: 1.02, color: INK, whiteSpace: "nowrap",
  fontSize: vw(0.85), textAlign: "right",
  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: vh(0.3),
};

/** An eighth note, drawn: the band's face has no ♪, and a TV whose fallback font lacks it
 *  would draw a box. Orange, as the band's other accents are. */
function Note({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 16 20" aria-hidden style={{ display: "block", height: size, width: "auto", overflow: "visible" }}>
      <path d="M7 1.5v12.2a3.6 3.2 0 1 0 1.8 2.8V6.2c2.2.4 4 1.8 4.8 4.2.5-3.8-2-6.6-4.8-7.4V1.5z" fill={ORANGE} />
    </svg>
  );
}

/** The band's music code with its label. Rendered into BookingBand's `music` slot —
 *  absolute, so it takes no grid track and moves nothing else in the band. */
export function MusicQr() {
  return (
    <a
      href={MUSIC_URL}
      data-music-qr
      /* The accessible name starts with the visible words (WCAG 2.5.3), so "click Scan for
         music" works for voice control on the public page. */
      aria-label="Scan for music: open the Exton Sports speaker remote"
      className="text-cond"
      style={{
        position: "absolute", top: 0, bottom: 0, right: vw(100 - TILE_END),
        display: "flex", alignItems: "center", gap: vw(0.5),
        color: "inherit", textDecoration: "none", pointerEvents: "auto", cursor: "pointer",
      }}
    >
      <span style={label}>
        <Note size={vh(2.6)} />
        <span>SCAN FOR</span>
        <span style={{ color: ORANGE }}>MUSIC</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
      <img
        src="/reception/music-qr.svg"
        alt={`QR code: ${MUSIC_URL}`}
        style={{
          flex: "none", height: BOOK_QR, width: BOOK_QR, display: "block", borderRadius: vh(0.5),
          boxShadow: "0 calc(0.4 * var(--vh)) calc(1.4 * var(--vh)) rgba(0,0,0,0.45)",
        }}
      />
      {/* The hairline between this code and the booking line: centred in the ~1vw of air
          to the booking line's left, a little shorter than the code. Absolute, so the tile's
          measured width and position do not change. */}
      <span
        aria-hidden
        style={{
          position: "absolute", right: vw(-0.5), top: "22%", bottom: "22%",
          width: vw(0.09), background: RULE_SOFT,
        }}
      />
    </a>
  );
}
