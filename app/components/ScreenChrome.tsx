"use client";

import type { CSSProperties, ReactNode } from "react";
import { makeTicker, useTick } from "./ticker";
import OrangishPill from "./OrangishPill";
import { PhoneNumber } from "./PhoneIcon";
import LogoGlobe from "./LogoGlobe";
import { CONTACT_PHONE } from "../../lib/legal";
import { EMBER, INK, LABEL, ORANGE, RULE, RULE_SOFT } from "./tv-palette";

/* The top strip and the bottom band of the in-club React screens.
   ──────────────────────────────────────────────────────────────────────────
   Lifted out of app/reception/ReceptionBoard.tsx on 2026-10-20, unchanged, when
   the exit-door TV's promotion screen (/exit) was asked to keep "the top and
   bottom strips as we have for the reception and vestibule TVs" (Aniket). One
   copy, so the two screens cannot drift: the clock, the date and the booking line
   look the same wherever someone meets them in the building. /reception was
   pixel-diffed at 1920x1080 after the move: the running page against production
   and origin/master, and (2026-10-20) the first paint before hydration, JS off,
   against origin/master, which is where Clock's placeholder shows. Identical.
   (The band's small booking QR is /reception's only — see BookingBand's
   showBookQr, 2026-10-20.)

   Both pieces are sized in --vw / --vh, so they only render correctly inside a
   box that sets those (BOX in tv-palette.ts). The caller lays them out: the header
   in flow at the top of a flex column, the band absolute at the box's foot, with
   `BAND_GAP + BOOK_BAND` of bottom padding on the box so nothing runs under it. */

/* The clock is an external store, shared with /comingsoon — see
   ticker.ts for why it is not useState + useEffect. */
/** Visible seconds for the clock. */
const secondTicker = makeTicker(1_000);

/* The booking band — one line under the boxes, the bottom of the screen
   (2026-10-18, Aniket: "a lot of people look at the reception screen — instead of
   'view this screen at extonsports.com/reception', create a band at the bottom:
   For bookings, go to extonsports.com or scan this"; then the phone number
   "larger font", and "orangish.io in the same line as the QR code line and phone
   number"). orangish.io left, the booking line and its QR in the middle, the
   club's number right.

   It replaces CREDIT_STRIP (2026-10-15..18), a 4.8vh strip under the boxes that
   held the pill (centred), "view this screen at extonsports.com/reception" (left)
   and, from 2026-10-16, the number (right). The address line went with it.

   Its height is the QR's: BOOK_QR plus a little air. The QR is the one thing on
   /reception meant to be read by a PHONE, not an eye, and a phone needs modules
   it can resolve. At 10.4vh a module is ~3.4px at 1080p (~2.3mm on the 55") —
   comfortable from the desk, not from across the lobby. Smaller saves the boxes
   height and costs scanning distance; measure before changing either.

   BAND_GAP + BOOK_BAND cost the boxes ~10vh more than the strip did, all of it
   from the NOW / COMING UP area. Measured 2026-10-18 at 1080p and 1366x768 on a
   quiet Sunday morning and a Tuesday 7:15 pm: every COMING UP row still shows.
   NOT measured: three live groups on every sport at once — with the 4.8vh strip
   that case had ~9px of NOW height to spare at 1080p, so it will now lose rows. */
export const BOOK_BAND = "calc(13 * var(--vh))";
const BOOK_QR = "calc(10.4 * var(--vh))";
/** Air between the boxes and the band's top rule. */
export const BAND_GAP = "calc(1.6 * var(--vh))";
/** The booking line and the number — large, because both are meant to be acted on. */
const BAND_TEXT = "calc(2 * var(--vw))";
/** The pill's text. A step under BAND_TEXT: its white ground makes it read larger
 *  than bare type of the same size, and this keeps the three items looking even. */
const BAND_PILL_TEXT = "calc(1.6 * var(--vw))";
/** Where the QR goes — the same no-login page the site's "Book a court or lane"
 *  button opens. The QR image (public/reception/book-qr.svg) is GENERATED from
 *  this string; change one and regenerate the other. */
const BOOK_URL = "https://app.orangish.io/book-court/exton-sports?theme=light";

/** Where the version stamp sits in the band (ScreenStamp through BookingBand's `stamp`;
 *  2026-10-20, with the freeze watchdog's heartbeat): bottom right on the band's 3.42vw
 *  edge, under the phone number, at 40% white — there for someone looking for it, not
 *  for anyone reading the screen. Inside the band so it scales with the 16:9 box;
 *  absolute, so it takes no grid track and moves nothing. One copy, so /reception's
 *  (and /vestibule's) court board and the Starter Pack on /exit and /outside put it on
 *  the same pixels. It only draws on a keyed screen or with ?diag. */
export const BAND_STAMP: CSSProperties = {
  position: "absolute", right: "calc(3.42 * var(--vw))", bottom: "calc(0.9 * var(--vh))",
  fontSize: "calc(0.62 * var(--vw))", color: "rgba(255,255,255,0.40)", letterSpacing: "0.08em",
  fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap", pointerEvents: "none",
};

/* The clock, isolated so the seconds do not re-render the board.
   Aniket asked for seconds (2026-10-07). At one tick per second the whole
   board would otherwise re-run its grouping sixty times a minute for weeks;
   keeping it in its own component means only this <span> updates, and the
   board's own clock stays on the slower tick that decides which hour is "now". */
function Clock() {
  const ms = useTick(secondTicker);
  /* Before the first tick (the server render, and the frame before hydration)
     the cell holds a NO-BREAK space, 2026-10-20. A plain space collapses, the
     cell loses its line box and the header draws 9px short; then the clock
     starts and everything under it drops 9px, on every load (tv-keeper relaunches
     /reception every ten minutes). Written as an escape, not the character, so
     no editor can quietly turn it back into a space, which is how it was lost
     when this moved out of ReceptionBoard.tsx. DateLine's placeholder likewise. */
  const text = ms
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
      }).format(new Date(ms))
    : "\u00a0";
  /* Tabular figures: without them the colon jitters left and right every
     second as the digit widths change, which is very visible on a wall. */
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
      {text}
    </span>
  );
}

/* The day and date, on the header's centre line (2026-10-10).

   Asked for in three steps: "show the date and day too", then "on the same line
   as the time", then "a bit larger, same font as the header row, top center".
   So it left the clock and became the header's middle column, set in the
   title's own face, size and colour by the caller.

   The year stays in. This board runs for months unattended; a frozen clock still
   reads like a plausible time of day and a weekday repeats every seven days, so a
   wrong YEAR is the only unmistakable sign the picture is stale. (The faint dot
   by the title only appears when a fetch fails — a tv-keeper relaunch onto a
   cached page would show neither.)

   America/New_York, not the browser's zone: the VIZIOs carry whatever timezone
   they shipped with and tv-keeper does not set it.

   Same one-second ticker as the clock, so the date turns over exactly at
   midnight rather than up to a tick late. It is its own component for the same
   reason the clock is: only this text re-renders, never the board. */
function DateLine() {
  const ms = useTick(secondTicker);
  return (
    <>
      {ms
        ? new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          }).format(new Date(ms)).toUpperCase()
        : "\u00a0" /* a no-break space, not a space: see Clock (2026-10-20) */}
    </>
  );
}

/** The top strip: the club's mark and name, the date on the centre line, the clock.
 *  `stale` adds the faint dot by the title that says a screen's feed has failed —
 *  /reception's; a screen with no feed (/exit) never sets it. */
export function ScreenHeader({ stale = false }: { stale?: boolean }) {
  return (
    /* 1fr auto 1fr, not flex space-between (2026-10-10, "top center"). The
       equal outer tracks put the date on the SCREEN's centre line; with three
       flex children it would sit midway between the title's edge and the
       clock's instead, and the clock changes width every second. */
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "baseline",
        columnGap: "calc(2 * var(--vw))",
        borderBottom: `1px solid ${RULE}`,
        paddingBottom: "calc(1.2 * var(--vh))", marginBottom: "calc(1.6 * var(--vh))",
      }}
    >
      {/* The club's mark left of the name (2026-10-16). Absolute, in room made by
          the title's own left padding, so the header row — and so the panels'
          1fr row under it — keeps its height: in flow, a mark taller than the
          type would push the header down and take that from the NOW areas,
          which have ~9px to spare when every court is busy. Centred on the
          title's line box. */}
      <div
        className="text-cond"
        style={{ color: EMBER, fontSize: "calc(2.1 * var(--vw))", letterSpacing: "0.10em", position: "relative", paddingLeft: "calc(3.6 * var(--vw))" }}
      >
        <LogoGlobe size="calc(2.8 * var(--vw))" ring style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }} />
        EXTON SPORTS CENTER
        {stale && (
          <span
            aria-hidden
            style={{
              display: "inline-block", width: "calc(0.5 * var(--vw))", height: "calc(0.5 * var(--vw))", borderRadius: "50%",
              background: RULE, marginLeft: "calc(0.6 * var(--vw))", verticalAlign: "middle",
            }}
          />
        )}
      </div>
      {/* The title's exact style — face, size, tracking, colour — so the date
          reads as part of the header row rather than a caption under it. */}
      <div
        className="text-cond"
        style={{ color: EMBER, fontSize: "calc(2.1 * var(--vw))", letterSpacing: "0.10em", whiteSpace: "nowrap", justifySelf: "center" }}
      >
        <DateLine />
      </div>
      <div className="text-cond" style={{ color: EMBER, fontSize: "calc(2.4 * var(--vw))", lineHeight: 1, justifySelf: "end" }}>
        <Clock />
      </div>
    </div>
  );
}

/** The booking band — see BOOK_BAND. Absolute at the foot of the 16:9 box.
 *  `showBookQr` (default true — /reception) draws the small booking QR and "or scan".
 *
 *  /exit passes false (2026-10-20, Aniket on the first draft: "hide the small QR on
 *  this screen"). That screen's whole point is ONE big code, the Starter Pack's, and
 *  a second code beside it is a coin toss for whoever lifts a phone — scan the wrong
 *  one and you are booking a court instead of buying lessons. The line then reads
 *  "For bookings, go to extonsports.com", with nothing to scan, and still sits on the
 *  screen's centre line: the middle track is `auto`, so it shrinks to the words alone
 *  and the 1fr tracks either side keep it centred. The band keeps its full height
 *  (BOOK_BAND), so the strip is the same size and in the same place on both screens.
 *  With the default, the markup is exactly what it was — /reception pixel-diffed
 *  against unmodified origin/master at 1920x1080 after this change: identical.
 *
 *  `stamp` (2026-10-20) is a slot for the screen-version stamp (ScreenStamp) that
 *  the freeze watchdog's heartbeat brought, drawn inside this band after the number.
 *  With the band living here, the stamp arrives through a prop. Both screens pass
 *  <ScreenStamp style={BAND_STAMP} />, which is positioned absolutely, so it takes
 *  no grid track; unset, or on an unkeyed screen without ?diag, it renders nothing
 *  and the band is unchanged. */
export function BookingBand({ showBookQr = true, stamp }: { showBookQr?: boolean; stamp?: ReactNode } = {}) {
  return (
    /* Full width under the boxes, so it reads as its own line on the wall rather
       than as part of them.

       1fr auto 1fr: the booking line is the reason for the band, so it takes the
       middle track and stays on the screen's centre line whatever the two ends
       measure; the ends sit on the same two edges as every line above them — the
       text INSIDE /reception's badminton and squash boxes, 2.2vw root padding +
       0.22vw border + 1vw panel padding = 3.42vw each side.

       - orangish.io (2026-10-15, Aniket: a credit on every Exton surface, as a
         pill): the `tv` pill is a <span>, not a link — nobody can tap a
         television. It is 1.05em of BAND_PILL_TEXT.
       - The booking line: the address in the board's orange. The QR sits on
         white with its own quiet zone (in the SVG), because a code on #0B1623
         with no margin is one many phone cameras will not lock on to.
         The line and the QR are ONE link to BOOK_URL (2026-10-18, Aniket: "QR
         code clickable/tappable"): the page is also public at
         extonsports.com/reception, and nobody can scan a code on their own
         phone's screen. The band ignores the pointer; the link opts back in.
         Same tab, like the site's other booking links. On a television it is
         inert — nothing there clicks.
       - The club's number (2026-10-16, Aniket: "write our phone number with a
         cellphone icon to signify thats a phone"). CONTACT_PHONE is the main
         line (the IVR), the same one the site prints everywhere — never a second
         copy typed in here. Full white with the icon carrying the orange, because
         a number is only any use if it can be read off the wall and dialled. */
    <div
      style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: BOOK_BAND,
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        columnGap: "calc(1.6 * var(--vw))", padding: "0 calc(3.42 * var(--vw))",
        borderTop: `calc(0.09 * var(--vw)) solid ${RULE_SOFT}`,
        background: "linear-gradient(180deg, rgba(248,155,114,0.10) 0%, rgba(248,155,114,0.03) 100%)",
        color: INK, fontSize: BAND_TEXT, whiteSpace: "nowrap", pointerEvents: "none",
      }}
    >
      <div style={{ justifySelf: "start", fontSize: BAND_PILL_TEXT }}>
        <OrangishPill tv />
      </div>
      <a
        href={BOOK_URL}
        aria-label="Book a court or lane at Exton Sports"
        style={{
          display: "flex", alignItems: "center", gap: "calc(1.4 * var(--vw))",
          color: "inherit", textDecoration: "none", pointerEvents: "auto", cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
          For bookings, go to{" "}
          <span style={{ color: ORANGE, fontWeight: 600 }}>extonsports.com</span>
          {showBookQr && <span style={{ color: LABEL }}> or scan</span>}
        </span>
        {showBookQr && (
          /* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */
          <img
            src="/reception/book-qr.svg"
            alt={`QR code: ${BOOK_URL}`}
            style={{
              height: BOOK_QR, width: BOOK_QR, display: "block", borderRadius: "calc(0.5 * var(--vh))",
              boxShadow: "0 calc(0.4 * var(--vh)) calc(1.4 * var(--vh)) rgba(0,0,0,0.45)",
            }}
          />
        )}
      </a>
      <div style={{ justifySelf: "end", fontWeight: 500, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>
        <PhoneNumber number={CONTACT_PHONE} color={ORANGE} />
      </div>
      {stamp}
    </div>
  );
}
