"use client";

import useReloadOnDeploy from "../components/useReloadOnDeploy";
import { ScreenHeader, BookingBand, BAND_GAP, BOOK_BAND, BAND_STAMP } from "../components/ScreenChrome";
import ScreenStamp from "../components/ScreenStamp";
import { BG, INK, BOX, PANEL } from "../components/tv-palette";
import {
  useCourtPanels, CourtBoxes, Lockup, SessionTag, LightStatus, dayLabel, sessionInk,
  PANEL_GLOW, PANEL_LIT, PANEL_BORDER, PANEL_SHADOW, type Entry, type Panel,
} from "../reception/ReceptionBoard";
import { SESSION_TEXT, SPORT_OBJECT, span } from "../board/board-lib";
import { usePromos } from "../exit/promos";
import StarterHero from "../exit/StarterHero";
import WorkshopHero from "../exit/WorkshopHero";
import BirthdayHero from "../exit/BirthdayHero";
import w from "../exit/workshop.module.css";
import v from "./vestibule.module.css";

/* The vestibule screen — the 75" VIZIO W4K75M (2026-10-21).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "i want to change the vestibule screen a bit. I don't want to be a
   replica of (almost) the reception screen. What i want is current bookings for
   cricket, badminton, squash followed by next booking. i also want the notices for
   starter pack, sera workshop, and the birthday. the bookings stay fixed to the
   top or left of the screen. on the right is these notification and marketing
   messages."

   So, between the same header and band as every other wall screen:
     LEFT, FIXED — one card per sport: what is on court now, and the booking after
       it. The reception board's data and its drawing pieces (useCourtPanels,
       Lockup, CourtBoxes, the lights chip) — one copy, so the vestibule can never
       disagree with the desk about who is on court — but none of reception's
       ten-row COMING UP list. The vestibule is walked through, not stood at.
     RIGHT, ROTATING — the exit-door screen's promotions, 5 s each: the Starter
       Pack, the workshop until 8pm on 30 Oct, the birthday until midnight on
       21 Oct. Which are up is promos.ts, shared with the exit door, so both walls
       change panel at the same moment and take a panel down at the same moment.

   ⛔ NAMES: unchanged, and not decided here. The vestibule's key has
   names_visible off, so its feed carries the partner organisations and nothing
   else; a private hire prints PRIVATE (board-lib holderLabel).

   THE CARDS. The same rule as reception's big area: a sport with somebody on court
   shows ON NOW and then NEXT; a sport with nobody on court shows UP NEXT (the
   earliest booking ahead, so the card always names one) and then AFTER THAT.
   ALL OPEN only when nothing at all is booked in the feed's window. One booking in
   the big area draws large; two or three draw as rows, so a busy evening fits.

   ONE CODE AT A TIME. The band has no booking QR here (showBookQr false), for the
   reason /exit has none: the promotions each carry a code, and two codes on one
   wall is a coin toss for whoever lifts a phone (Aniket, 2026-10-20, on /exit).

   No heartbeat in here: TvScreen.tsx sends it, named "vestibule". */

/** How many simultaneous starts go up into the big area when nobody is on court —
 *  reception's number, for the same reason (splitUpNext in board-lib). */
const UP_NEXT_MAX = 2;

/** How many rows the big area draws. Three fit a card at 1080p with the label
 *  over them (measured, review 2026-10-21); a fourth holder on court is counted
 *  on the ON NOW line instead of being drawn half off the card. */
const BIG_ROWS_MAX = 3;

/** One booking as a single line: time, then the partner's session word and the
 *  holder (the holder is what truncates), then the court boxes. `more` is how many
 *  others start at the same moment, said as "+N" in the line rather than on a line
 *  of its own: a line of its own came out of the ON NOW area's height and sliced
 *  the booking above it top and bottom (review, 2026-10-21). */
function Row({ e, sport, labels, today, lead, more = 0 }: { e: Entry; sport: string; labels: string[]; today: string; lead?: string; more?: number }) {
  const day = dayLabel(e.date, today);
  return (
    <div className={`text-cond ${lead !== undefined ? v.nextRow : v.row}`}>
      {lead !== undefined && <span className={v.nextLabel}>{lead}</span>}
      <span className={v.rowTime}>{day ? `${day} ` : ""}{span(e.from, e.to)}</span>
      <span className={v.rowWho}>
        {e.session && (
          <span
            className={v.rowSession}
            style={{ color: sessionInk(e.session), ...(e.session === "free-girls-class" ? { textTransform: "none" as const } : {}) }}
          >
            {SESSION_TEXT[e.session]}
          </span>
        )}
        <span className={v.rowHolder}>{e.who}</span>
        {more > 0 && <span className={v.more}>+{more}</span>}
      </span>
      <CourtBoxes sport={sport} labels={labels} taken={e.courts} />
    </div>
  );
}

/** One booking, large: the holder's lockup and session tag, then the time with the
 *  court boxes on the same line. */
function Big({ e, sport, labels }: { e: Entry; sport: string; labels: string[] }) {
  return (
    <div>
      <div className={v.bigWho}>
        <Lockup brand={e.brand} who={e.who} />
        {e.session && <SessionTag session={e.session} />}
      </div>
      <div className={v.bigWhen}>
        <span className={`text-cond ${v.bigTime}`}>{span(e.from, e.to)}</span>
        <CourtBoxes sport={sport} labels={labels} taken={e.courts} big />
      </div>
    </div>
  );
}

function SportCard({ p, today }: { p: Panel; today: string }) {
  const live = p.now.length > 0;
  const big = live ? p.now : p.upNext;
  const day = !live && big.length ? dayLabel(big[0].date, today) : "";
  const shown = big.slice(0, BIG_ROWS_MAX);
  const hidden = big.length - shown.length;
  const then = p.upcoming[0];
  /* Somebody else starting at the same moment as `then` — said, not hidden. */
  const alsoThen = then
    ? p.upcoming.filter((e) => e !== then && e.date === then.date && e.from === then.from).length
    : 0;

  return (
    <section
      className={v.card}
      style={{
        background: `${PANEL_GLOW}, ${PANEL_LIT}, ${PANEL}`,
        border: `calc(0.22 * var(--vw)) solid ${PANEL_BORDER}`,
        boxShadow: PANEL_SHADOW,
      }}
    >
      <div className={`text-cond ${v.head}`}>
        <span className={v.sport}>
          {p.sport.toUpperCase()}
          {SPORT_OBJECT[p.sport] && (
            // eslint-disable-next-line @next/next/no-img-element -- see ReceptionBoard: an .svg sized in em
            <img className={v.object} src={SPORT_OBJECT[p.sport]} alt="" aria-hidden />
          )}
        </span>
        {p.light && (
          <span className={v.chip}>
            <LightStatus chip={p.light} />
          </span>
        )}
      </div>

      <div className={v.slot}>
        {big.length === 0 ? (
          <div className={`text-cond ${v.allOpen}`}>ALL OPEN</div>
        ) : (
          <>
            <div className={`text-cond ${v.slotLine}`}>
              {live ? "ON NOW" : "UP NEXT"}
              {day && <span className={v.slotDay}> · {day}</span>}
              {hidden > 0 && <span className={v.slotDay}> · +{hidden} more on court</span>}
            </div>
            {shown.length === 1 ? (
              <Big e={shown[0]} sport={p.sport} labels={p.labels} />
            ) : (
              shown.map((e) => (
                <Row key={`${e.date}-${e.from}-${e.session ?? ""}-${e.who}`} e={e} sport={p.sport} labels={p.labels} today={today} />
              ))
            )}
          </>
        )}
      </div>

      <div className={v.next}>
        {then ? (
          <Row e={then} sport={p.sport} labels={p.labels} today={today} lead={!live && big.length ? "AFTER THAT" : "NEXT"} more={alsoThen} />
        ) : (
          <div className={`text-cond ${v.nextRow}`}>
            <span className={v.nextLabel}>{!live && big.length ? "AFTER THAT" : "NEXT"}</span>
            <span className={v.nothing}>{big.length ? "Nothing else booked" : "Nothing booked"}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function VestibuleScreen() {
  useReloadOnDeploy();
  /* Reception's feed, merged by reception's rules. `upcoming: 3` — the card shows
     one row of it, and looks two further for a booking starting at the same moment.
     `currentOnly`: ON NOW lists only what is on court this minute (see the hook). */
  const { panels, today, stale } = useCourtPanels({ upcoming: 3, upNextMax: UP_NEXT_MAX, currentOnly: true });
  const { withWorkshop, withBirthday, count, slot, birthdaySlot } = usePromos();

  return (
    <div style={{ position: "absolute", inset: 0, background: BG }}>
      {/* The same 16:9 box and paddings as /reception and /exit (BOX), so the
          header and the band land on the same pixels on every wall. */}
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

        <div className={v.body}>
          {/* One equal row per sport the feed carries — three at Exton today. Not a
              fixed three in the CSS: a fourth sport added on the platform reaches
              this wall with no deploy here (review, 2026-10-21). */}
          <div className={v.cards} style={{ gridTemplateRows: `repeat(${Math.max(panels.length, 1)}, minmax(0, 1fr))` }}>
            {panels.map((p) => (
              <SportCard key={p.sport} p={p} today={today} />
            ))}
          </div>

          <div className={v.promoFrame}>
            <div className={v.promoScale}>
              <div className={`${w.stack} ${v.promoStack}`}>
                <StarterHero className={slot(0)} panel />
                {withWorkshop && <WorkshopHero className={slot(1)} panel />}
                {withBirthday && <BirthdayHero className={slot(birthdaySlot)} panel />}
              </div>
            </div>
            {/* Which of the N panels is up: a dot each, the lit one on the same
                swap clock as the panels (the same slot classes), so it can never
                point at a panel that is not showing. */}
            {count > 1 && (
              <div className={v.dots} aria-hidden>
                {Array.from({ length: count }, (_, i) => (
                  <span key={i} className={v.dot}>
                    <span className={`${v.dotOn} ${slot(i)}`} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <BookingBand showBookQr={false} stamp={<ScreenStamp style={BAND_STAMP} />} />
      </div>
    </div>
  );
}
