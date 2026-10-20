"use client";

import type { CSSProperties } from "react";
import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND } from "../components/ScreenChrome";
import { BG, INK, BOX, ORANGE } from "../components/tv-palette";
import { STARTER_PACK_URL } from "../../lib/booking";
import s from "./exit.module.css";

/* The exit-door screen — the Squash Starter Pack (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   The VIZIO WHD32M (32", 1920x1080) that was the "outside" TV now hangs indoors
   facing the EXIT door, for events and promotions. Aniket: "the first promotion we
   want to do is the squash starter pack - create a screen (with some animation) -
   you may keep the top and bottom strips as we have for the reception and vestibule
   TVs.. The CTA for this would be a QR Code to purchase the starter pack at Exton."

   So: /reception's header and booking band, unchanged (components/ScreenChrome —
   one copy for both screens), and between them the offer, a squash court with one
   rally playing on it, and a large SCAN TO BUY code.

   THE WORDS ARE THE OFFER PAGE'S (app.orangish.io/starter/exton-sports, read
   2026-10-20), not ours: five 30-minute private lessons with a squash coach, $195
   for all five, juniors under 19, once per player, no expiry. That page is where
   the rules are enforced (age, once-ever) and where the price comes from (Exton's
   rates row); this screen only repeats it. If the offer changes there, change the
   copy here the same day — a wall that quotes the wrong price is worse than none.

   No data feed: nothing on it changes but the clock. It reloads itself on a deploy
   like every other screen (useReloadOnDeploy).

   ⚠️ WHICH TV SHOWS THIS IS NOT DECIDED HERE — tv-keeper's tvs.json on the N95
   (orangish-cameras) holds the url per screen. Building this page changed no TV. */

/** The code's target. public/exit/starter-qr.svg is GENERATED from this string's
 *  production value (python segno, error level M, 4-module quiet zone, version 4 —
 *  33 modules — dark #0B1623 on white): change the URL and regenerate the SVG, then
 *  scan it off the screen with a phone. */
const BUY_URL = STARTER_PACK_URL;

/* The copy's entrance order, in seconds after load — and again every 40 s. */
const at = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

/* The court, drawn as the rally's camera sees it: on the centre line 11 m from the
   front wall (a gallery seat just behind the back wall), eye 2.6 m up, looking
   straight at the front wall, which is drawn 280 px wide in a 403 x 756 stage (the
   stage's size at 1080p; the SVG stretches with it and the shape never changes —
   see .stage). Front wall 6.4 m wide and 4.57 m to the out line, tin 0.48 m,
   service line 1.78 m, side-wall out line falling to 2.13 m at the back wall,
   short line 4.26 m from the front wall, service boxes 1.6 m square. The rally in
   exit.module.css is the same projection of one shot, sampled every 1/6 of each
   leg — so the ball strikes between the service line and the out line, and lands
   behind the short line, because that is where the numbers put it.

   Lines in the brand orange, as a court's are red; the front wall a pale veil
   because Exton's courts are glass. Static: painted once. */
function Court() {
  return (
    <svg className={s.court} viewBox="0 0 403.2 756" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="exit-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.09" />
        </linearGradient>
        <linearGradient id="exit-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFBE97" stopOpacity="0.10" />
          <stop offset="1" stopColor="#FFBE97" stopOpacity="0" />
        </linearGradient>
        {/* The whole drawing fades out towards the stage's sides and foot, so it has
            no hard edge where the stage cuts it off — the floor and the glass side
            walls run on past both sides, as they would from a seat at the back. An
            ellipse round the front wall, which stays at full strength. */}
        <radialGradient id="exit-fade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(201.6 250) scale(215 500)">
          <stop offset="0.78" stopColor="#FFFFFF" />
          <stop offset="0.95" stopColor="#000000" />
        </radialGradient>
        <mask id="exit-mask" maskUnits="userSpaceOnUse" x="-200" y="0" width="800" height="756">
          <rect x="-200" y="0" width="800" height="756" fill="url(#exit-fade)" />
        </mask>
      </defs>

      <g mask="url(#exit-mask)">
        {/* The floor, and the glass side walls either side of the front wall. */}
        <polygon points="61.6,269.9 341.6,269.9 600,479.9 600,756 -200,756 -200,479.9" fill="url(#exit-floor)" />
        <polygon points="61.6,70 -106.4,111.1 -106.4,406.4 61.6,269.9" fill="#FFFFFF" fillOpacity="0.035" />
        <polygon points="341.6,70 509.6,111.1 509.6,406.4 341.6,269.9" fill="#FFFFFF" fillOpacity="0.035" />
        <g stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1.2" fill="none">
          <line x1="61.6" y1="269.9" x2="-106.4" y2="406.4" />
          <line x1="341.6" y1="269.9" x2="509.6" y2="406.4" />
          <line x1="61.6" y1="70" x2="61.6" y2="269.9" />
          <line x1="341.6" y1="70" x2="341.6" y2="269.9" />
        </g>

        {/* The front wall: its face, the tin, the service line, the out line. */}
        <rect x="61.6" y="70" width="280" height="199.9" fill="url(#exit-wall)" />
        <rect x="61.6" y="248.9" width="280" height="21" fill={ORANGE} fillOpacity="0.42" />
        <g stroke={ORANGE} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <line x1="61.6" y1="248.9" x2="341.6" y2="248.9" />
          <line x1="61.6" y1="192.1" x2="341.6" y2="192.1" />
          <line x1="61.6" y1="70" x2="341.6" y2="70" />
          <line x1="61.6" y1="70" x2="-106.4" y2="111.1" />
          <line x1="341.6" y1="70" x2="509.6" y2="111.1" />
        </g>

        {/* The floor's lines: short line, half-court line, the service boxes. */}
        <g stroke={ORANGE} strokeOpacity="0.75" strokeWidth="2" fill="none">
          <line x1="-26.9" y1="341.8" x2="430.1" y2="341.8" />
          <line x1="201.6" y1="341.8" x2="201.6" y2="938" />
          <line x1="87.4" y1="341.8" x2="51.8" y2="399.6" />
          <line x1="51.8" y1="399.6" x2="-98" y2="399.6" />
          <line x1="315.8" y1="341.8" x2="351.4" y2="399.6" />
          <line x1="351.4" y1="399.6" x2="501.2" y2="399.6" />
        </g>
      </g>
    </svg>
  );
}

export default function ExitScreen() {
  useReloadOnDeploy();

  return (
    <div style={{ position: "absolute", inset: 0, background: BG }}>
      {/* The same 16:9 box as /reception — see BOX — with the same paddings, so the
          header and the band land on exactly the same pixels on both screens. */}
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
        <ScreenHeader />

        <main className={s.hero}>
          <section className={s.copy}>
            <h1 className={s.title}>
              <span className={`${s.kicker} ${s.rise}`} style={at(0.1)}>Squash</span>
              <span className={`${s.name} ${s.rise}`} style={at(0.25)}>Starter Pack</span>
            </h1>
            <p className={`${s.price} ${s.rise}`} style={at(0.55)}>
              <span className={s.amount}><span className={s.dollar}>$</span>195</span>
              <span className={s.per}>for all five lessons</span>
            </p>
            <p className={`${s.lead} ${s.rise}`} style={at(0.8)}>
              Five 30-minute private lessons with a squash coach at Exton Sports
            </p>
            <ul className={s.facts}>
              <li className={s.rise} style={at(1.05)}>For juniors under 19</li>
              <li className={s.rise} style={at(1.2)}>Once per player</li>
              <li className={s.rise} style={at(1.35)}><strong>No expiry</strong> — book the five lessons whenever suits you</li>
            </ul>
          </section>

          <div className={s.stage} aria-hidden>
            <Court />
            <span className={s.hit} />
            <span className={s.land} />
            <span className={s.shadowMover}><span className={s.shadow} /></span>
            <span className={s.mover}>
              <span className={s.ball}>
                <span className={s.halo} />
                <span className={s.clip}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
                  <img src="/reception/squash-ball.svg" alt="" />
                </span>
              </span>
            </span>
          </div>

          {/* The code and its label are ONE link to the offer, like /reception's
              booking QR (2026-10-18): the page is public at extonsports.com/exit,
              and nobody can scan a code on their own phone's screen. On the
              television it is inert. */}
          <a className={`${s.cta} ${s.riseOnce}`} href={BUY_URL} aria-label="Buy the Squash Starter Pack at Exton Sports">
            <span className={s.scan}>SCAN TO BUY</span>
            <span className={s.card}>
              <span className={s.ring} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
              <img className={s.code} src="/exit/starter-qr.svg" alt={`QR code: ${BUY_URL}`} />
            </span>
            <span className={s.url}>{BUY_URL.replace(/^https?:\/\//, "")}</span>
          </a>
        </main>

        <BookingBand />
      </div>
    </div>
  );
}
