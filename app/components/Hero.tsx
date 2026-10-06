"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Fragment, useState, useEffect } from "react";
import Image from "next/image";
import type { AvailabilityPayload } from "../api/availability/route";
import type { CourtAvailability } from "../api/court-availability/route";
import type { SchedulePayload } from "../api/schedule/route";
import type { ProgramSchedule } from "@/lib/club-schedule";
import { COURT_RATES, RATE_BANDS, RATE_FOOTNOTE, CLASS_FEES_NOTE } from "../../lib/rates";
import { BOLLYWOOD_CLASS_URL, SQUAD_CLASS_URL, BOOK_COURTS_URL, CLASS_ONLINE_BOOKING_LIVE } from "../../lib/booking";
import { SPORT_BOOKING_OPENS_LABEL, sportBookingOpen, sportShutOnDate, sportsNotYetOpen } from "../../lib/opening";
import { PBA_SCHEDULE, PBA_EXPANDS, PBA_COURTS } from "../../lib/pba-schedule";
import { SQUAD_SCHEDULE, SQUAD_NOTE, SQUAD_TERM } from "../../lib/squad-schedule";
import BadmintonEnquiry from "./BadmintonEnquiry";
import BookingsCalendar from "./BookingsCalendar";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_E164, LEGAL_NAME } from "../../lib/legal";

type PanelKey = "academies" | "recreation";

export default function Hero() {
  const [hovered, setHovered] = useState<PanelKey | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    // Defer first read so it doesn't fire synchronously inside the effect
    const initial = mq.matches;
    setTimeout(() => setIsMobile(initial), 0);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const flexFor = (key: PanelKey) => {
    if (isMobile) return 1;
    if (hovered === null) return 1;
    /* ⛔ THE FLOOR IS 0.85, NOT 0.7, AND IT IS LOAD-BEARING. At 0.7 a hovered
       panel squeezed the other one to 389px on a 1280 screen, which is narrower
       than the rate table's own columns — three rows overflowed by 36px and the
       panel's overflow:hidden cut the prices off. 0.85 gives it 444px there,
       comfortably past the 434px the table needs.
       The hover still reads: 1.6 against 0.85 is nearly twice the width. */
    return hovered === key ? 1.6 : 0.85;
  };

  return (
    <section
      id="top"
      className={`relative ${isMobile ? "flex-col" : "flex"}`}
      style={
        isMobile
          ? { marginTop: 64 }
          : {
              display: "flex",
              marginTop: 64,
              // The recreation panel now carries a rate card and a booking
              // row, which can run past a short viewport. min-height keeps the
              // original full-bleed feel; the fixed height it replaced used to
              // clip the bottom of the panel on laptop screens.
              minHeight: "calc(100svh - 64px - 240px)",
            }
      }
    >
      {/* LEFT: Recreation */}
      <Panel
        kind="recreation"
        flex={flexFor("recreation")}
        onEnter={() => !isMobile && setHovered("recreation")}
        onLeave={() => !isMobile && setHovered(null)}
        hovered={isMobile ? true : hovered === "recreation"}
        anyHovered={isMobile ? true : hovered !== null}
        isMobile={isMobile}
      />

      {/* RIGHT: Academies and studio. These were two panels. Three columns
          left each one too narrow to say anything, and the studio's three
          classes and the three academies are the same shape of thing — a list
          of programmes you sign up for, as opposed to a court you rent by the
          hour. They share one roster now. */}
      <Panel
        kind="academies"
        flex={flexFor("academies")}
        onEnter={() => !isMobile && setHovered("academies")}
        onLeave={() => !isMobile && setHovered(null)}
        hovered={isMobile ? true : hovered === "academies"}
        anyHovered={isMobile ? true : hovered !== null}
        isMobile={isMobile}
      />

    </section>
  );
}

/* ─── Single panel ─────────────────────────────────────────────── */

function Panel({
  kind,
  flex,
  onEnter,
  onLeave,
  hovered,
  anyHovered,
  isMobile,
}: {
  kind: PanelKey;
  flex: number;
  onEnter: () => void;
  onLeave: () => void;
  hovered: boolean;
  anyHovered: boolean;
  isMobile: boolean;
}) {
  const config = kind === "academies" ? ACADEMIES : RECREATION;
  /* Which roster row the pointer is on, across both groups. Panel-local:
     nothing outside this panel cares. Cleared on leaving the ROSTER rather than
     the panel, so the detail does not flicker while the pointer crosses the gap
     between the two columns. */
  const [activeItem, setActiveItem] = useState<string | null>(null);

  /* The drifting wordmark is the hero's only continuous motion, and a very
     large one. prefers-reduced-motion exists for exactly this, so the pan is
     dropped entirely when it is set — the mark stays, it simply stops moving,
     which is the same trade globals.css:191 makes for the ember pulse. */
  const reduceMotion = useReducedMotion();

  /* The timetable, per program name. Client-side and best-effort: the panel
     renders complete without it, and every row whose program has no sessions
     simply shows no schedule line rather than an empty placeholder. Only the
     academies panel asks. */
  const [schedule, setSchedule] = useState<SchedulePayload["programs"]>([]);
  useEffect(() => {
    if (kind !== "academies") return;
    let live = true;
    fetch("/api/schedule")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SchedulePayload | null) => live && setSchedule(d?.programs ?? []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [kind]);

  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      animate={isMobile ? {} : { flex }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`relative cursor-pointer ${
        isMobile ? "overflow-visible" : "overflow-hidden"
      } ${
        /* "Every panel except the last", not a named panel. Keying it on a
           name is what broke it the last two times the panel count changed. */
        kind !== "academies"
          ? isMobile
            ? "border-b-2 border-[var(--color-ember)]"
            : "border-r-2 border-[var(--color-ember)]"
          : ""
      }`}
      style={
        isMobile
          ? { background: config.bg }
          : { background: config.bg, flexBasis: 0 }
      }
    >
      {/* Inner radial dim */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--hero-dim)" }}
      />

      {/* Big background wordmark, and the hero's moving part.

          It was a single initial per panel — "R" and "A" — which read as stray
          letters and had to be re-chosen whenever a panel was renamed. It is
          the club's name on both panels now, sized in vw so it scales with the
          panel rather than the text.

          THE DRIFT IS THE POINT. Nothing else in the hero moves on its own; the
          panels only respond to a pointer, so on an untouched page it is
          completely still. A very slow pan on the one element that is pure
          texture gives it life without anything legible sliding around.

          Deliberately slow and deliberately small: tens of seconds per pass and
          a few dozen pixels of travel. Fast enough to notice on a second look,
          never fast enough to compete with the copy on top of it. The two
          panels drift in opposite directions over different periods so they
          never look like one image sliding, and never resync.

          Only `transform` animates — x, y and scale — so this stays on the
          compositor and never triggers layout. The mark still bleeds off the
          edge and the panel still clips it: it is texture, not a heading, and
          the crop is what keeps it from competing with one. */}
      <motion.span
        aria-hidden
        animate={{
          /* FAINTER, confirmed by the owner — I had read "lighter" as brighter
             and pushed it the wrong way. It is texture, and the mark got large
             enough at 24vw that presence now comes from area rather than
             opacity: this is fainter than the 0.04 it sat at even before the
             enlargement, and still reads, because there is far more of it.
             --hero-glyph is #FFFFFF in dark and #0A1019 in light, picked so
             the mark is equally faint in both — see globals.css. A tint either
             way, never a fill. */
          opacity: hovered ? 0.068 : 0.032,
          scale: hovered ? 1.06 : 1,
          ...(reduceMotion
            ? { x: 0, y: 0 }
            : kind === "academies"
              ? { x: [0, -150], y: [0, 52] }
              : { x: [0, 128], y: [0, -44] }),
        }}
        transition={{
          opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          /* Mirror rather than loop, so it eases back instead of snapping to
             the start. Co-prime-ish periods keep the two axes from meeting at
             the same point and turning the drift into a visible diagonal. */
          x: reduceMotion
            ? { duration: 0.4 }
            : { duration: kind === "academies" ? 23 : 19, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
          y: reduceMotion
            ? { duration: 0.4 }
            : { duration: kind === "academies" ? 15 : 17, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
        }}
        className="absolute pointer-events-none select-none text-cond"
        style={{
          color: "var(--hero-glyph)",
          /* Much larger than the initial it replaced. Five letters in a
             condensed face run about 2.6em wide, so this is wider than the
             panel on purpose — the crop is the composition. */
          fontSize: isMobile ? "clamp(4.5rem, 30vw, 10rem)" : "clamp(7rem, 24vw, 34rem)",
          lineHeight: 0.78,
          letterSpacing: "-0.04em",
          whiteSpace: "nowrap",
          top: kind === "academies" ? "-6%" : undefined,
          bottom: kind === "recreation" ? "-8%" : undefined,
          left: kind === "academies" ? "-5%" : undefined,
          right: kind === "recreation" ? "-6%" : undefined,
        }}
      >
        {/* One span per letter so the spread animates on TRANSFORM. The obvious
            implementation is animating letter-spacing, and it is the wrong one:
            that is a layout property, so every frame would reflow a 300px-tall
            line and drag the whole panel through layout with it. Per-letter
            translate stays on the compositor.

            Each letter's offset is its distance from the centre, normalised to
            -1..1, so E and N travel the full amount, X and O half, and T — the
            middle — does not move at all. That is what makes it read as the
            word breathing rather than five letters sliding.

            The stagger is deliberate: delaying by distance from centre means
            the letters never share a phase, so the word keeps drifting in and
            out of true instead of pulsing in lockstep. Combined with the
            parent's own pan, no two frames repeat for minutes. */}
        {config.bigWord.split("").map((ch, i, all) => {
          const mid = (all.length - 1) / 2;
          const off = mid === 0 ? 0 : (i - mid) / mid;
          return (
            <motion.span
              key={`${ch}-${i}`}
              /* inline-block, because transforms do not apply to inline boxes. */
              className="inline-block"
              animate={reduceMotion ? { x: 0 } : { x: [0, off * LETTER_SPREAD] }}
              transition={
                reduceMotion
                  ? { duration: 0.4 }
                  : {
                      duration: kind === "academies" ? 13 : 11,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                      delay: Math.abs(off) * 0.9,
                    }
              }
            >
              {ch}
            </motion.span>
          );
        })}
      </motion.span>


      {/* Body content */}
      {/* px-6 below xl, px-12 at and above it.
 
          48px of padding a side is right at 1440+, and is what pushed the rate
          table into a scrollbar on smaller laptops: at 1200 with the other
          panel hovered the card had 320px and needed 322 — short by two
          pixels, entirely spent on padding. Halving it below 1280 hands 48px
          back to the content and the table fits from about 1100 up.
 
          Below roughly 1080 it still scrolls, which is what the overflow-x-auto
          on the card is for. There is no padding value that fixes that: the
          panel is ~260px there and the table's own column minimums are 322. */}
      <div className={`relative z-[3] flex flex-col ${isMobile ? "p-8 pt-10 pb-10" : "h-full px-6 xl:px-12 pt-16 pb-12 justify-start"}`}>
        <span className="label-chip self-start mb-[18px]">
          {config.label}
        </span>
        <h2
          className="text-cond text-white mb-[18px]"
          style={{ fontSize: "clamp(2.4rem, 6.2vw, 5.4rem)" }}
        >
          {config.headline.line1}
          <br />
          <span className="text-[var(--color-ember)]">
            {config.headline.line2}
          </span>
        </h2>

        {/* Body text — always visible on mobile, reveals on hover on desktop */}
        <motion.div
          animate={
            isMobile
              ? { opacity: 1, maxHeight: 400 }
              : {
                  opacity: !anyHovered ? 0.85 : hovered ? 1 : 0,
                  maxHeight: !anyHovered ? 80 : hovered ? 120 : 0,
                }
          }
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="overflow-hidden"
        >
          {kind === "academies" ? (
            <p className="text-white/70 text-[0.94rem] leading-[1.55] mb-4">
              {config.body}
            </p>
          ) : (
            <p className="text-white/70 text-[0.94rem] leading-[1.55] mb-4">
              {config.body}
            </p>
          )}
        </motion.div>

        {/* Court rates — always visible on the Recreation panel.
            Exton sells court time, not memberships, so the price is the offer
            and it belongs above the fold rather than behind a CTA. */}
        {/* The fifth column never opens on mobile. `hovered` is forced true
            there, but a 375px panel is already fully consumed by the four
            fixed columns, so the fr-based fifth track resolves to 0px and the
            cell renders at full opacity inside a zero-width column — visible
            to a screen reader, invisible to everyone else. Mobile keeps four
            columns and gets the same data as a block underneath instead. */}
        {kind === "recreation" && (
          <RateCard open={SHOW_NEXT_SLOT && !isMobile && hovered} stacked={isMobile} />
        )}

        {/* The hired-courts rule, which used to sit in the pricing explainer at
            the top of the footer.

            It belongs against the price. Someone reading "one rate covers the
            whole court" is deciding what they may do with that court, and the
            answer was two sections away. This panel is the court-hire panel, so
            the condition of hire sits at the foot of it — mirroring the
            coaching-roles note pinned to the foot of the academies panel.

            ⛔ SCOPED TO HIRED COURTS, and the scope is load-bearing. The club
            runs academies and advertises them in the panel immediately to the
            right; a blanket "no coaching of any kind" would read as
            contradicting them. The rule is that a court you hire is not a
            teaching slot — coaching is what the academy programme sells, which
            is why the second line points at it. */}
        {kind === "recreation" && (
          <div className="w-full mt-auto pt-8">
            <div className="pt-5 border-t border-white/10">
              <p
                className="m-0 text-white/80 font-semibold uppercase tracking-[0.06em] leading-[1.5]"
                style={{ fontSize: RATE_BODY }}
              >
                Absolutely no coaching on hired courts — recreational play only.
              </p>
              {/* "Coaching partners", not "the club's academies": none of the three
                  academies is the club's. Philadelphia Badminton and SquashTigers hold
                  licences and run their own programmes, and the studio floor is SeRa
                  Fitness's class. Calling them the club's own overstated the
                  relationship on the one line that has to be exact, because it is the
                  line that tells a hirer why they may not bring their own coach.
                  Aniket's wording, 2026-10-05. */}
              <p className="m-0 text-white/35 mt-1" style={{ fontSize: RATE_NOTE }}>
                Coaching through our coaching partners only.
              </p>
            </div>
          </div>
        )}

        {/* The roster — a LIST first, the detail second.

            Two groups in one column: partner academies, then the club's own
            studio classes. They were separate panels; at three columns neither
            had room to say anything, and both are the same kind of offer — a
            programme you sign up for, not a court you rent.

            It reads in three steps: the roster is always there, the panel's own
            hover brings in a sentence about how coaching works here, and
            pointing at a row swaps that sentence for the thing itself.

            Mobile has no hover and plenty of column, so it skips the mechanism
            and stacks every detail. */}
        {kind === "academies" &&
          (isMobile ? (
            <div className="w-full mt-3 flex flex-col gap-7">
              {ROSTER_GROUPS.map((g) => (
                <div key={g.label}>
                  <div className="text-mono text-[0.54rem] tracking-[0.2em] uppercase text-white/35 mb-3">
                    {g.label}
                  </div>
                  <div className="flex flex-col gap-5">
                    {g.items.map((it) => (
                      <RosterDetail key={it.id} id={it.id} schedule={schedule} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="w-full mt-4 flex gap-9 items-start"
              onMouseLeave={() => setActiveItem(null)}
            >
              {/* The roster. Legible even at the panel's narrow width — it is
                  the one thing here that should never need a hover. */}
              <div className="shrink-0 flex flex-col gap-5">
                {ROSTER_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div className="text-mono text-[0.54rem] tracking-[0.2em] uppercase text-white/35 mb-1">
                      {g.label}
                    </div>
                    <ul className="list-none m-0 p-0 flex flex-col">
                      {g.items.map((it) => {
                        const on = activeItem === it.id;
                        const inner = (
                          <>
                            <motion.span
                              aria-hidden
                              animate={{ opacity: on ? 1 : 0.3, scaleX: on ? 1 : 0.4 }}
                              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                              /* --ember-ink, NOT --color-ember: only the TEXT
                                 utility is remapped for light
                                 (globals.css:401), so an ember BACKGROUND
                                 stays pale salmon on white. */
                              className="block h-px w-5 shrink-0 origin-left bg-[var(--ember-ink)]"
                            />
                            <span
                              className={`text-cond leading-none whitespace-nowrap transition-colors ${
                                on ? "text-[var(--color-ember)]" : "text-white/80"
                              }`}
                              style={{ fontSize: "clamp(1.15rem, 1vw, 1.45rem)" }}
                            >
                              {it.short}
                            </span>
                          </>
                        );
                        /* Focus mirrors hover so the detail is reachable by
                           keyboard, not only by pointer. */
                        const shared = {
                          onMouseEnter: () => setActiveItem(it.id),
                          onFocus: () => setActiveItem(it.id),
                          className:
                            "flex items-center gap-3 py-2 pr-8 no-underline w-full text-left bg-transparent border-0 cursor-pointer",
                        };
                        return (
                          <li
                            key={it.id}
                            className="border-b border-white/10 last:border-b-0"
                          >
                            {/* Academies are partner brands with their own
                                sites, so their rows are links. Studio classes
                                are run in-house and have nowhere to send
                                anyone, so theirs are disclosure buttons rather
                                than links to a page that does not exist. */}
                            {it.href ? (
                              <a
                                href={it.href}
                                target="_blank"
                                rel="noreferrer"
                                {...shared}
                              >
                                {inner}
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveItem(it.id)}
                                {...shared}
                              >
                                {inner}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {/* The detail. Fades in with the panel, then swaps per row.

                  `hovered || activeItem` rather than `hovered` alone: activeItem
                  is set on FOCUS as well as hover, so a keyboard tabbing the
                  roster opens the detail too. */}
              <motion.div
                /* `initial` matters here, and is not decoration. framer applies
                   `animate` only after hydration, so without it the column
                   paints fully visible on first load and the intro spills out
                   of the closed panel until JS runs — more obvious now that the
                   whole detail set is server-rendered. An explicit initial gets
                   opacity:0 into the SSR markup. */
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: hovered || activeItem ? 1 : 0,
                  x: hovered || activeItem ? 0 : -8,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="min-w-0 flex-1 border-l border-white/10 pl-9 min-h-[190px]"
                aria-hidden={!(hovered || activeItem)}
              >
                {/* Every layer is RENDERED and only one is visible — see
                    DetailLayer. Mounting just the active one put the whole
                    detail column outside the server-rendered HTML. */}
                <div className="grid">
                  <DetailLayer show={!activeItem}>
                    {/* Matches the detail blurb it introduces. At 0.82rem it
                        was the smallest text in the panel despite being the
                        first thing anyone reads in it. */}
                    <p
                      className="text-white/60 leading-[1.6] max-w-[56ch] m-0"
                      style={{ fontSize: "clamp(1rem, 0.95vw, 1.3rem)" }}
                    >
                      {rosterIntro()}
                    </p>
                  </DetailLayer>
                  {ROSTER_GROUPS.flatMap((g) =>
                    g.items.map((it) => (
                      <DetailLayer key={it.id} show={activeItem === it.id}>
                        <RosterDetail id={it.id} schedule={schedule} />
                      </DetailLayer>
                    )),
                  )}
                </div>
              </motion.div>
            </div>
          ))}

        {/* The coaching-roles note, which used to sit at the very bottom of the
            homepage under About.

            It belongs here. This is the coaching panel — three academies and a
            studio — so a line about wanting coaches is the same subject, and it
            was previously separated from it by two full sections. The panel
            also had the room: below the roster there was nothing but empty
            column.

            mt-auto pins it to the bottom of the panel rather than letting it
            float under the roster, so it reads as a footer to this panel
            instead of a stray fourth item in the list.

            The dot is the nav chip's pulse, reused rather than reinvented — it
            is already how this site says "there is something live here". It is
            bg-[var(--ember-ink)], NOT --color-ember: only the TEXT utility is
            remapped for light (globals.css:401), so a --color-ember background
            would stay pale salmon on white. motion-reduce drops the pulse and
            keeps the dot, the same trade .opening-glow makes at
            globals.css:192.

            id="careers" survives the section it was named for. Nothing links to
            /#careers any more, but the anchor was live and shared, so inbound
            links still land on the sentence that answers them. */}
        {kind === "academies" && (
          <div
            id="careers"
            className="w-full mt-auto pt-8 scroll-mt-24"
          >
            <p className="flex flex-wrap items-baseline gap-x-[14px] gap-y-2 m-0 pt-5 border-t border-white/10">
              <span
                className="text-mono text-[var(--color-ember)] inline-flex items-center gap-2 whitespace-nowrap"
                style={{ fontSize: RATE_LABEL }}
              >
                <span className="relative flex h-[6px] w-[6px]">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--ember-ink)] opacity-70 animate-ping motion-reduce:animate-none" />
                  <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--ember-ink)]" />
                </span>
                Coaching roles
              </span>
              <span className="text-white/60" style={{ fontSize: RATE_BODY }}>
                Interested in coaching? Email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=General%20coaching%20interest`}
                  className="text-white border-b border-[var(--color-ember)]/55 hover:border-[var(--color-ember)] transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                — we&apos;re always looking for coaching talent.
              </span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* One academy, rendered the same way in both places — the desktop detail column
   and the mobile stack. Kept as a component so the two cannot drift.

   The logo is NOT a link here. On desktop the roster name already goes to the
   academy's site and the CTA goes there too; a third link to the same URL in one
   view is noise for anyone tabbing or listening rather than looking. */
/* One stacked layer of the detail column. All layers occupy the same grid cell,
   so the column is as tall as its tallest child and nothing reflows on swap.

   visibility, not just opacity, does the hiding. An element left at opacity 0 is
   still focusable and still read aloud, so the three inactive academies would
   sit in the tab order as invisible links. `visibility: hidden` takes them out
   of both, while keeping them in the DOM — which is the whole point, since the
   markup is what the crawler reads.

   The two states are SEQUENCED, not crossfaded. Every layer sits in the same
   grid cell, so fading them simultaneously overlaps two blocks of text for the
   duration — muddy and unreadable. The outgoing layer fades in 110ms and the
   incoming one waits that long before starting, which is what AnimatePresence's
   mode="wait" used to do here. Hiding also delays visibility until its fade
   finishes; showing flips it at once so there is something to fade in. */
function DetailLayer({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="[grid-area:1/1]"
      style={{
        opacity: show ? 1 : 0,
        visibility: show ? "visible" : "hidden",
        transition: show
          ? "opacity 170ms ease-out 110ms"
          : "opacity 110ms ease-out, visibility 0s linear 110ms",
      }}
    >
      {children}
    </div>
  );
}

/* One roster row's detail, looked up by id. Both groups render through here so
   the desktop column and the mobile stack cannot drift apart. */
function RosterDetail({
  id,
  schedule,
}: {
  id: string;
  schedule: SchedulePayload["programs"];
}) {
  const ac = ACADEMY_PARTNERS.find((a) => a.name === id);
  if (ac) {
    /* Platform first, local copy second. Matched on the PLATFORM's programme
       name; no academy has one yet, so today every academy falls through to
       whatever `schedule` it carries in the data below. The moment a programme
       is created the live feed wins and the local line stops being used. */
    const live = schedule.find((p) => p.program === ac.short);
    return <AcademyDetail ac={ac} schedule={live ?? localSchedule(ac) ?? null} />;
  }
  const c = STUDIO_CLASSES.find((x) => x.name === id);
  if (!c) return null;
  const live = schedule.find((p) => p.program === c.name);
  return <ClassDetail c={c} schedule={live ?? localSchedule(c) ?? null} />;
}

/* Blurb and schedule SIDE BY SIDE, not stacked.

   Stacked, this column used 38% of its width at 2560px — 900px of empty panel
   beside a 542px paragraph. Widening the measure is not the fix: a 1400px line
   is unreadable. Two columns spend the width on a second thing instead.

   flex-wrap, so it stacks again on a narrow panel rather than crushing both.
   The blurb keeps a real measure (56ch) instead of stretching. Rows with no
   schedule simply have no second column, which is most of them today. */
function DetailBody({
  blurb,
  schedule,
  action,
  book,
  registerHref,
}: {
  blurb?: string;
  schedule: DetailSchedule | null;
  action?: { label: string; href: string };
  book?: { label: string; href: string };
  registerHref?: string;
}) {
  /* Mirrors ScheduleLine's own early return. Kept here as well so the caller can
     tell whether that component will render anything BEFORE calling it — which is
     what lets the Register button fall back to a column of its own. */
  const showSchedule =
    !!schedule && (!!schedule.when || !!schedule.startsOn || !!schedule.status);
  return (
    <div className="mt-4 flex flex-wrap items-start gap-x-14 gap-y-7">
      <div className="min-w-[28ch] max-w-[56ch] flex-1">
        {blurb && (
          <p
            className="text-white/70 leading-[1.6] m-0"
            style={{ fontSize: "clamp(1rem, 0.95vw, 1.3rem)" }}
          >
            {blurb}
          </p>
        )}
        <DetailAction action={action} book={book} />
      </div>
      {/* ⚠️ THE REGISTER BUTTON MUST NOT DEPEND ON THE SCHEDULE FETCH.
          ScheduleLine returns null when there is no schedule, and the dance row's
          schedule comes from the PLATFORM at runtime, not from the bundle — so
          putting the CTA inside it meant a slow or failed call took the Register
          button down with the times and the packs, and crawlers never saw it at
          all (confirmed against production 2026-10-05: curl found the squash
          button and not the dance one). The squash row was unaffected because its
          table is local data.

          So: inside the column when there IS a schedule, in a column of its own
          when there is not. Either way the button renders. */}
      {showSchedule ? (
        <ScheduleLine schedule={schedule} registerHref={registerHref} />
      ) : registerHref ? (
        <div className="shrink-0 min-w-[15rem] border-l border-white/10 pl-9">
          <RegisterCta href={registerHref} />
        </div>
      ) : null}
    </div>
  );
}

/* What the schedule block can lead with. The platform only ever supplies a
   start date; local copy may instead carry a status — squash is enrolling now
   and has no published Exton timetable, so "Starts ..." would be the wrong
   sentence and a date would be an invented one. */
type DetailSchedule = ProgramSchedule & { status?: string | null };

/* Local timetable copy, widened to the shape the platform feed produces so
   ScheduleLine does not need to know which one it is holding. Everything the
   platform supplies and a hand-written line cannot — price, duration, capacity
   — stays null, and ScheduleLine simply omits it. */
function localSchedule(item: {
  name: string;
  short?: string;
  schedule?: { startsOn?: string; when?: string; status?: string };
}): DetailSchedule | null {
  const local = item.schedule;
  if (!local) return null;
  return {
    program: item.short ?? item.name,
    when: local.when ?? null,
    duration: null,
    price: null,
    upcoming: 0,
    full: false,
    // A hand-written line never carries pack prices — those only exist on the
    // platform, which is the point of not typing them here.
    packs: [],
    startsOn: local.startsOn ?? null,
    status: local.status ?? null,
  };
}

/* The live timetable line. Renders NOTHING when the platform has no sessions —
   never a placeholder, never a hardcoded time. app/api/featured/route.ts
   already encodes this rule ("omit its schedule line rather than inventing
   one"); the hero previously broke it by printing the same opening date three
   times, a placeholder dressed as a feed. */
function ScheduleLine({ schedule, registerHref }: { schedule: DetailSchedule | null; registerHref?: string }) {
  if (!schedule || (!schedule.when && !schedule.startsOn && !schedule.status)) return null;
  /* "$25" alone is unambiguous on its own. Under a pack list it is not — it
     sits directly above "4 classes $80" and reads as a fourth price rather than
     the single-session one. So it is labelled ONLY when packs are shown, which
     leaves every other row's line exactly as it was. Same word the Featured
     rail uses, for the same reason. */
  const priceLabel =
    schedule.price && schedule.packs.length > 0
      ? `${schedule.price} drop-in`
      : schedule.price;
  const meta = [schedule.duration, priceLabel].filter(Boolean).join(" · ");
  return (
    <div className="shrink-0 min-w-[15rem] border-l border-white/10 pl-9">
      <div className="text-mono text-[0.58rem] tracking-[0.2em] uppercase text-white/35 mb-2">
        Schedule
      </div>
      {/* Only present until the first session passes — see startsOn in
          app/api/schedule/route.ts. It leads, because "when does it begin" is
          the question a recurring pattern does not answer. */}
      {(schedule.status || schedule.startsOn) && (
        <div className="text-[var(--color-ember)] text-mono text-[0.68rem] tracking-[0.08em] mb-1.5">
          {schedule.status ?? `Starts ${schedule.startsOn}`}
        </div>
      )}
      {/* /90, not /85. The light theme remaps these utilities BY NAME
          (globals.css:372-387) and that set is 20-80 plus 90 — there is no
          .text-white/85 rule, so an /85 stayed rgba(255,255,255,0.85) and the
          schedule rendered white-on-white in light mode. Only use an opacity
          that block actually lists. */}
      {schedule.when && (
        <div
          className="text-white/90 leading-[1.35]"
          style={{ fontSize: "clamp(1.05rem, 1vw, 1.4rem)" }}
        >
          {schedule.when}
        </div>
      )}
      {meta && <div className="text-white/50 text-[0.85rem] mt-1.5">{meta}</div>}
      {/* Multi-session packs. Absent for every row but the studio classes, and
          absent for those too whenever the platform cannot be reached — so this
          renders nothing rather than an empty heading.

          STICKER PRICES, matching the Studio's own flyer — and here the sticker
          IS the total. This used to carry RATE_FEES_NOTE, on the reasoning that
          one disclosure covering courts and classes alike beat two conventions
          on one page. That reasoning was overtaken on 2026-09-09: Exton listed
          "program" in fee_processing_absorb_surfaces, so the club absorbed the
          card fee on classes and packs while courts stayed a pass-through. The
          old note promised "$80 is $82.70 at checkout" and the customer is in
          fact charged $80.00 — verified against /api/public/clubs/exton-sports,
          which returns all_in === rate for both packs. Two conventions on one
          page is worse than one; quoting a number nobody is charged is worse
          than both.

          ⚠️ AND ON 2026-09-30 IT WENT BACK TO ONE CONVENTION — courts moved to
          absorb as well, so there is nothing left anywhere on this page that
          adds a fee at checkout. RATE_FEES_NOTE was deleted rather than
          reworded (see lib/rates.ts, where the reasoning is kept). This note
          survives because it says something still worth saying on a pack price:
          the number IS the number. The court rate card needs no equivalent —
          it has no fee line at all now, which says the same thing by saying
          nothing. */}
      {schedule.packs.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="text-mono text-[0.58rem] tracking-[0.2em] uppercase text-white/35 mb-2">
            Packs
          </div>
          <ul className="list-none m-0 p-0 flex flex-col gap-1">
            {schedule.packs.map((pk) => (
              <li key={pk.quantity} className="flex items-baseline justify-between gap-6">
                <span className="text-white/80 text-[0.9rem]">
                  {pk.quantity} classes
                </span>
                <span className="text-white/90 text-[0.95rem] tabular-nums">{pk.price}</span>
              </li>
            ))}
          </ul>
          {/* One line, not one per row: every pack Exton sells shares a
              validity, and repeating "45 days" twice reads as though they
              might differ. Falls back to per-row only if they ever do. */}
          {(() => {
            const days = [...new Set(schedule.packs.map((p) => p.validityDays))];
            if (days.length !== 1 || days[0] == null) return null;
            return (
              <div className="text-white/50 text-[0.8rem] mt-2">
                Valid {days[0]} days from purchase
              </div>
            );
          })()}
          <div className="text-white/35 text-[0.75rem] mt-1">{CLASS_FEES_NOTE}</div>
        </div>
      )}
      {schedule.full && (
        <div className="text-[var(--color-ember)] text-mono text-[0.62rem] mt-2">
          Currently full
        </div>
      )}
      {registerHref && <RegisterCta href={registerHref} />}
    </div>
  );
}

/* The CTAs for a row. Every destination is somewhere that actually accepts the
   thing its label promises — see the per-row comments in the data below.

   `book` is the self-serve route and leads where a row has one: it is the only
   path that can also sell the multi-session pack, which a phone call cannot.
   The phone/email `action` keeps its exact appearance and stays beside it,
   because it is the route that needs no account at all. */
function DetailAction({
  action,
  book,
}: {
  action?: { label: string; href: string };
  book?: { label: string; href: string };
}) {
  if (!action && !book) return null;
  const external = action?.href.startsWith("http");
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {book && (
        <a
          href={book.href}
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-[var(--color-ember)] text-black hover:bg-[var(--color-ember-hi)] text-mono text-[0.7rem] transition-colors"
        >
          <span className="inline-block px-5 py-2.5">{book.label}</span>
        </a>
      )}
      {action && (
        <a
          href={action.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="inline-block text-[var(--color-ember)] hover:text-white text-mono text-[0.7rem] transition-colors"
        >
          <span className="inline-block border border-[var(--color-ember)]/50 px-5 py-2.5">{action.label}</span>
        </a>
      )}
    </div>
  );
}

/* A studio class. No logo and no outbound link — these are the club's own, and
   there is no page to send anyone to yet. */
function ClassDetail({
  c,
  schedule,
}: {
  c: (typeof STUDIO_CLASSES)[number];
  schedule: DetailSchedule | null;
}) {
  return (
    <div>
      {c.logo && <span className="block leading-none mb-3.5">{c.logo}</span>}
      <span
        className="block text-cond text-white leading-[0.95] mb-3"
        style={{ fontSize: "clamp(2.4rem, 3.2vw, 4.2rem)" }}
      >
        {c.title ?? c.name}
      </span>
      {c.when && (
        <span className="block text-mono text-[0.64rem] tracking-[0.18em] uppercase text-[var(--color-ember)]">
          {c.when}
        </span>
      )}
      <DetailBody
        blurb={c.blurb ?? c.desc}
        schedule={schedule}
        action={c.action}
        book={c.book}
        registerHref={"registerHref" in c ? (c as { registerHref?: string }).registerHref : undefined}
      />
    </div>
  );
}

/* An academy row's timetable, in the column where the other rows put their
   one-line schedule. Shared by badminton and squash because the two differ only
   in their columns — badminton splits coaching from open play, squash is all
   coached — and a second copy of this markup would drift.

   ⚠️ ONLY the text-white/NN steps that globals.css re-declares under
   :root[data-theme="light"] are safe here — 20,25,30,35,40,45,50,55,60,65,70,
   75,80,90. There is no /85, and an /85 cell shipped white-on-white in light
   mode on 2026-10-05. Check the ladder before inventing a step. */
/* The Register CTA that sits at the foot of the schedule column — i.e. to the
   RIGHT of the class, beside its times rather than under its prose.

   Only squash and dance/fitness have one. Cricket and badminton deliberately do
   not: their bookings are not managed on app.orangish.io (Aniket, 2026-10-05),
   so a Register button there would lead somewhere that cannot take the booking.
   Badminton keeps its enquiry form instead, which is the honest CTA for a class
   whose registration happens off-platform.

   Gated on CLASS_ONLINE_BOOKING_LIVE, which is the single switch for the whole
   self-serve path — read the warning on it before assuming it should be on. */
function RegisterCta({ href }: { href: string }) {
  if (!CLASS_ONLINE_BOOKING_LIVE) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-block bg-[var(--color-ember)] text-black hover:bg-[var(--color-ember-hi)] text-mono text-[0.7rem] transition-colors"
    >
      <span className="inline-block px-5 py-2.5">Register</span>
    </a>
  );
}

function AcademyScheduleTable({
  status,
  headers,
  rows,
  notes,
  registerHref,
}: {
  status?: string;
  headers: string[];
  rows: string[][];
  notes: string[];
  registerHref?: string;
}) {
  return (
    <div className="shrink-0 min-w-[17rem] border-l border-white/10 pl-9">
      <div className="text-mono text-[0.58rem] tracking-[0.2em] uppercase text-white/35 mb-2.5">
        Schedule
      </div>
      {/* Status leads, as it does in ScheduleLine: "when does it begin" is the
          question a recurring pattern does not answer. */}
      {status && (
        <div className="text-[var(--color-ember)] text-mono text-[0.68rem] tracking-[0.08em] mb-2.5">
          {status}
        </div>
      )}
      <table className="w-full border-collapse text-[0.78rem]">
        <thead>
          <tr className="text-mono text-[0.55rem] tracking-[0.14em] uppercase text-white/30">
            {headers.map((h, i) => (
              <th key={h} scope="col" className={`text-left font-normal pb-1.5${i < headers.length - 1 ? " pr-4" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-white/10">
              <th scope="row" className="text-left font-normal text-white/50 py-1.5 pr-4 whitespace-nowrap">
                {r[0]}
              </th>
              {r.slice(1).map((cell, i) => (
                <td
                  key={i}
                  className={`py-1.5 text-white/90 whitespace-nowrap${i < r.length - 2 ? " pr-4" : ""}`}
                >
                  {cell || <span className="text-white/20">&mdash;</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {notes.map((t) => (
        <p key={t} className="text-white/35 text-[0.72rem] leading-relaxed mt-3 max-w-[22rem]">
          {t}
        </p>
      ))}
      {registerHref && <RegisterCta href={registerHref} />}
    </div>
  );
}

function AcademyDetail({
  ac,
  schedule,
}: {
  ac: (typeof ACADEMY_PARTNERS)[number];
  schedule: DetailSchedule | null;
}) {
  const blurb = "blurb" in ac ? (ac as { blurb?: string }).blurb : undefined;
  const desc = "desc" in ac ? (ac as { desc?: string }).desc : undefined;
  const action = "action" in ac ? (ac as { action?: { label: string; href: string } }).action : undefined;

  const isBadminton = ac.name === "Philadelphia Badminton";
  const isSquash = ac.name === "SquashTigers";
  const table = isBadminton ? (
    <AcademyScheduleTable
      headers={["Day", "Coaching", "Open play"]}
      rows={PBA_SCHEDULE.map((r) => [r.day, r.coaching ?? "", r.openPlay ?? ""])}
      notes={[`${PBA_COURTS}. ${PBA_EXPANDS}`]}
    />
  ) : isSquash ? (
    <AcademyScheduleTable
      status={schedule?.status ?? undefined}
      headers={["Day", "Squad"]}
      rows={SQUAD_SCHEDULE.map((r) => [r.day, r.time])}
      notes={[SQUAD_NOTE, SQUAD_TERM]}
      registerHref={SQUAD_CLASS_URL}
    />
  ) : null;

  return (
    <div>
      <span className="block leading-none mb-4">{ac.logo}</span>
      <span className="block text-mono text-[0.64rem] tracking-[0.18em] uppercase text-[var(--color-ember)]">
        {ac.sport}
      </span>
      {/* Status first and small — "Coming soon" is a fact about timing, not a
          description — then the blurb underneath it. */}
      {desc && desc !== blurb && (
        <p className="text-white/45 text-[0.82rem] leading-[1.5] mt-2 mb-0">{desc}</p>
      )}
      {/* 60ch, not 48. The column is far wider than the tile this copy was
          sized for, and a short measure in a wide box is what was leaving half
          the panel empty. 60ch is still inside the 45-75 readable range. */}
      {/* Two rows have a real, Exton-specific timetable and get a table instead of
          the one-line schedule column; badminton additionally replaces its outbound
          "Learn more" with an enquiry form. Everything else still goes through
          DetailBody / ScheduleLine / DetailAction, which are shared with cricket
          and the studio classes and are deliberately untouched. */}
      {table ? (
        <div className="mt-4 flex flex-wrap items-start gap-x-14 gap-y-7">
          <div className="min-w-[28ch] max-w-[56ch] flex-1">
            {blurb && (
              <p
                className="text-white/70 leading-[1.6] m-0"
                style={{ fontSize: "clamp(1rem, 0.95vw, 1.3rem)" }}
              >
                {blurb}
              </p>
            )}
            {isBadminton ? (
              <div className="mt-5">
                <BadmintonEnquiry />
              </div>
            ) : (
              <DetailAction action={action} />
            )}
          </div>
          {table}
        </div>
      ) : (
        <DetailBody blurb={blurb} schedule={schedule} action={action} />
      )}
    </div>
  );
}

/* ─── Rate card + booking row ──────────────────────────────────── */

/* Header and body rows share one column template so the two never drift.
   The price columns are floored at the width of the word "STANDARD" — at the
   old 52px they were sized for the figures underneath and the headers ran
   into each other.

   The trailing first-slot column collapses to 0fr until the panel is hovered.
   It holds a formatted date, so it is by far the widest cell in the row, and
   at rest the panel is too narrow to show it without the text running under
   the panel's own edge. Revealing it on hover ties it to the expansion the
   panel already does, so the column arrives exactly when the room does.

   grid-template-columns is animated rather than the cells: animating the
   track keeps the four price columns still while the fifth opens, which
   swapping between two templates would not. */
/* ⛔ THE "FIRST SLOT" COLUMN IS OFF. Flip this to re-enable it.
   Parked 2026-08-31, not deleted, because the mechanism is sound and only the
   data behind it is missing: the platform endpoint it proxies
   (GET /api/public/next-availability) does not exist yet, so every sport falls
   back to the same pre-opening date and the column printed
   "Mon, Sep 21 · 6:00 AM" three times — three rows of identical text dressed up
   as live data. Better to show nothing than to show a placeholder that looks
   like a feed. Turn it back on with the endpoint, not before. */
const SHOW_NEXT_SLOT = false;

const rateGrid = (open: boolean) =>
  `minmax(84px,1fr) repeat(3,minmax(66px,0.5fr)) minmax(0,${open ? "1.1fr" : "0fr"})`;

/* The recreation panel's type scale.
 *
 * These were fixed rem, set when both panels held small tiles. Scaling the
 * academies detail column up left this side visibly smaller — same hero, two
 * different type sizes — so the two now meet.
 *
 * ⚠️ CLAMPED ON vw, AND THE FLOOR MATTERS. Each floor is the size this text was
 * before, so nothing grows on a narrow screen. That is deliberate: rateGrid()
 * floors the sport column at 84px and each price column at 66px, and those
 * minimums only bind when the panel is narrow — which is exactly where the type
 * now stays put. Growth happens only above roughly 1400px, where the columns
 * are sized by fr and have room to spare. Raising the floors instead would have
 * risked overflowing the table on a laptop.
 *
 * The ceilings are matched to the academies column: RATE_BODY tops out at the
 * same 1.3rem as the blurb over there, RATE_PRICE just under it. */
const RATE_LABEL = "clamp(0.56rem, 0.5vw, 0.72rem)";
const RATE_SPORT = "clamp(0.95rem, 0.9vw, 1.3rem)";
const RATE_PRICE = "clamp(0.84rem, 0.8vw, 1.15rem)";
const RATE_NOTE = "clamp(0.7rem, 0.62vw, 0.92rem)";
const RATE_BODY = "clamp(0.78rem, 0.75vw, 1.05rem)";

/* This site says peak / off-peak / late night; the platform's rate rules say
   peak / standard / late_night. One join, written down once, because getting
   it wrong shows a plausible but wrong column rather than an error. */
const API_BAND: Record<string, string> = {
  peak: "peak",
  offPeak: "standard",
  lateNight: "late_night",
};

/* Grey at 100%, colour only once something is gone: an empty week should
   read calm, not alarming. Shared by the desktop bars and the phone's
   heatmap so the two can never disagree about what a colour means. */
function fillFor(pct: number | null): string {
  if (pct === null) return "transparent";
  if (pct === 100) return "rgba(255,255,255,0.14)";
  if (pct >= 60) return "rgba(66,181,77,0.55)";
  return "rgba(248,155,114,0.65)";
}

/* ⚠️ A DAY BEFORE THE SPORT OPENS IS NOT AN EMPTY DAY. The endpoint counts
   occupancy and nothing is booked before opening, so without this a sport
   reads "all free" on days it cannot be booked at all. Gated on the
   per-sport dates because the three come online across the first week.

   Moved into lib/opening.ts 2026-10-03 so the bookings calendar asks the same
   question of the same dates. The version that lived here built a Date with
   EDT hardcoded; see sportShutOnDate for why that was an hour wrong after
   1 November. */
const shutOn = sportShutOnDate;

/* THE PHONE'S RENDERING, and deliberately not the desktop one shrunk.
   Seven columns of "12/18 free" is unreadable at 375px, so the numbers go
   and colour carries the signal with a legend. In exchange the phone shows
   ALL THREE BANDS of a sport at once — 21 cells — where the desktop hover
   shows one band at a time. The constraint produced the denser view. */
function MobileHeat({
  sport, data, offset, onOffset,
}: {
  sport: string;
  data: CourtAvailability;
  offset: number;
  onOffset: (n: number) => void;
}) {
  const page = data.days.slice(offset * 7, offset * 7 + 7);
  const hasNext = data.days.length > 7;
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-US", o);
  /* Composed, not one formatter call: {weekday, day} together renders
     "2 Fri" here, which reads as a quantity. Same trap as WeekStrip. */
  const dayLabel = (d: string) =>
    `${fmt(d, { weekday: "short" })} ${new Date(`${d}T12:00:00`).getDate()}`;

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "34px repeat(7, 1fr)" }}>
        <span />
        {page.map((d) => (
          <span key={d} className="text-mono text-center text-white/40" style={{ fontSize: "0.5rem" }}>
            {fmt(d, { weekday: "narrow" })}
          </span>
        ))}
        {RATE_BANDS.map((b) => (
          <Fragment key={b.key}>
            <span className="text-mono text-white/45 self-center" style={{ fontSize: "0.5rem" }}>
              {b.key === "offPeak" ? "Off-pk" : b.key === "lateNight" ? "Late" : "Peak"}
            </span>
            {page.map((d) => {
              const shut = shutOn(sport, d);
              const c = shut
                ? null
                : data.cells.find(
                    (x) => x.sport === sport && x.band === (API_BAND[b.key] ?? b.key) && x.date === d,
                  ) ?? null;
              const pct = c && c.total > 0 ? Math.round((c.free / c.total) * 100) : null;
              return (
                <span
                  key={d}
                  className="rounded-[2px]"
                  style={{
                    height: "15px",
                    background: shut ? "transparent" : fillFor(pct),
                    border: shut ? "1px dashed rgba(255,255,255,0.18)" : undefined,
                  }}
                  title={
                    shut
                      ? `${sport} not bookable ${dayLabel(d)}`
                      : c
                        ? `${dayLabel(d)} — ${c.free} of ${c.total} court-hours free`
                        : undefined
                  }
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-white/35" style={{ fontSize: "0.56rem" }}>
          {dayLabel(page[0])} &ndash; {dayLabel(page[page.length - 1])}
        </span>
        {hasNext && (
          <button
            type="button"
            className="text-mono text-white/45 px-2 py-1 rounded-[2px] border border-white/15"
            style={{ fontSize: "0.5rem" }}
            aria-label={offset === 0 ? "Show next week" : "Back to this week"}
            onClick={() => onOffset(offset === 0 ? 1 : 0)}
          >
            {offset === 0 ? "next week ›" : "‹ this week"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-white/40" style={{ fontSize: "0.52rem" }}>
        {[
          ["all free", "rgba(255,255,255,0.14)"],
          ["some gone", "rgba(66,181,77,0.55)"],
          ["nearly out", "rgba(248,155,114,0.65)"],
        ].map(([label, bg]) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span className="inline-block rounded-[2px]" style={{ width: 9, height: 9, background: bg }} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block rounded-[2px]"
            style={{ width: 9, height: 9, border: "1px dashed rgba(255,255,255,0.3)" }}
          />
          shut
        </span>
      </div>
    </div>
  );
}

/* The hovered cell's week, as seven bars.
   Court-hours, NOT "hours with a court free" — see lib/floor.ts and the
   endpoint. The friendlier measure reads "6 of 6 free" for cricket peak while
   Chester County Cricket holds two of the three lanes, because lane 3 is never
   taken; court-hours says 12 of 18, which is the fact a cricketer needs. */
function WeekStrip({
  sport, bandKey, bandLabel, data, offset, onOffset,
}: {
  sport: string;
  bandKey: string;
  bandLabel: string;
  data: CourtAvailability;
  /** 0 = this week, 1 = next. Two pages only; the platform's booking window
      is 30 days but a marketing panel showing a month of bars is a wall. */
  offset: number;
  onOffset: (n: number) => void;
}) {
  const apiBand = API_BAND[bandKey] ?? bandKey;
  /* ⚠️ A DAY BEFORE THE SPORT OPENS IS NOT AN EMPTY DAY. The endpoint counts
     occupancy, and nothing is booked before opening, so cricket honestly
     reported "18 of 18 free" on days you cannot book cricket at all — the
     courts are not free, they do not exist to the public yet. Those days are
     marked shut instead. The gate is the per-sport date in lib/opening.ts,
     because the three sports come online across the first week. */
  const closedOn = (d: string) => shutOn(sport, d);
  /* Both weeks arrive in one payload, so paging is a slice, not a fetch. */
  const page = data.days.slice(offset * 7, offset * 7 + 7);
  const hasNext = data.days.length > 7;
  const cells = page.map((d) =>
    data.cells.find((c) => c.sport === sport && c.band === apiBand && c.date === d) ?? null);
  /* A day with no cell is not zero — it is a band with no hours left today,
     which is why today's late night vanishes after 6am. Rendered as a gap. */
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2">
        <span className="text-mono text-[var(--color-ember)]" style={{ fontSize: RATE_LABEL }}>
          {/* Explicit {" "} around every expression: JSX drops the literal
              space that follows one, which rendered "Peak· next 7 days". The
              same trap About.tsx documents for LEGAL_NAME. */}
          {sport}{" "}&middot;{" "}{bandLabel}{" "}&middot;{" "}
          {offset === 0 ? "this week" : "next week"}
        </span>
      </span>
      {/* The pager sits at the RIGHT EDGE OF THE DAYS, not up in the title:
          it is a "what comes after Thursday" control, so it belongs where
          Thursday ends. One button, two jobs — forward a week, then back.

          A chevron here is navigation, not the decorative trailing arrow that
          came off every CTA on 2026-10-02. It IS the control; without it the
          button is an unlabelled box. */}
      <div className="flex items-stretch gap-2">
      <div className="grid grid-cols-7 gap-[5px] flex-1 min-w-0">
        {page.map((d, i) => {
          const shut = closedOn(d);
          const c = shut ? null : cells[i];
          const pct = c && c.total > 0 ? Math.round((c.free / c.total) * 100) : null;
          const fill = fillFor(pct);
          /* Composed, not formatted in one call: toLocaleDateString with
             {weekday,day} rendered "2 Fri" here, which reads as a quantity.
             Weekday then number is the order a person scans a week in. */
          const dt = new Date(`${d}T12:00:00`);
          const label = `${dt.toLocaleDateString("en-US", { weekday: "short" })} ${dt.getDate()}`;
          /* Each day is a booking link as well, so the panel is not a
             dead-end read: you see Wednesday is nearly gone and the next
             click is the booking page. */
          return (
            <a
              key={d}
              href={BOOK_COURTS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-center no-underline rounded-[3px] px-[2px] py-[1px] hover:bg-[var(--color-ember)]/10 focus-visible:bg-[var(--color-ember)]/10 focus:outline-none transition-colors"
              aria-label={
                shut
                  ? `${sport} is not bookable on ${label} — opens ${SPORT_BOOKING_OPENS_LABEL[sport] ?? "soon"}`
                  : `Book ${sport} on ${label} — ${c ? `${c.free} of ${c.total} court-hours free` : "no hours in this band"}`
              }
            >
              <span className="text-mono block text-white/45" style={{ fontSize: RATE_LABEL }}>{label}</span>
              {/* Dashed and empty, not a zero bar: shut and fully booked must
                  not look alike. */}
              <div
                className={`relative mt-1 overflow-hidden rounded-[2px] ${
                  shut ? "border border-dashed border-white/20" : "bg-white/[0.06]"
                }`}
                style={{ height: "30px" }}
              >
                {!shut && (
                  <span className="absolute inset-x-0 bottom-0" style={{ height: `${pct ?? 0}%`, background: fill }} />
                )}
              </div>
              <span
                className={`block mt-1 tabular-nums ${shut ? "text-white/35" : "text-white/70"}`}
                style={{ fontSize: RATE_LABEL }}
              >
                {shut ? "shut" : c ? `${c.free}/${c.total} free` : "—"}
              </span>
            </a>
          );
        })}
      </div>
      {hasNext && (
        <button
          type="button"
          /* Aligned to the BARS, not the whole cell: the day label sits above
             them and the figure below, so centring on the column would float
             the chevron off the row it belongs to. */
          className="shrink-0 self-start mt-[18px] w-6 flex items-center justify-center rounded-[2px] border border-white/15 text-white/50 hover:text-[var(--color-ember)] hover:border-[var(--color-ember)]/50 focus-visible:text-[var(--color-ember)] focus-visible:border-[var(--color-ember)] focus:outline-none transition-colors"
          style={{ height: "30px", fontSize: "0.8rem", lineHeight: 1 }}
          aria-label={offset === 0 ? "Show next week" : "Back to this week"}
          title={offset === 0 ? "Next week" : "This week"}
          onClick={() => onOffset(offset === 0 ? 1 : 0)}
        >
          {offset === 0 ? "›" : "‹"}
        </button>
      )}
      </div>
      {/* Asked twice what the numbers were, which is twice more than a term
          should need. "Court-hours" is courts x hours and nobody is obliged
          to infer that, so the panel says it, with this band's own numbers.
          Derived from the commonest day rather than hardcoded: the bands have
          different widths on weekends, and squash has four courts where the
          others have three. */}
      {(() => {
        const totals = cells.filter(Boolean).map((c) => c!.total);
        if (!totals.length) return null;
        const modal = totals.sort((a, b) =>
          totals.filter((t) => t === b).length - totals.filter((t) => t === a).length)[0];
        const courts = data.courtsBySport[sport];
        if (!courts || !modal || modal % courts !== 0) return null;
        return (
          <span className="text-white/40" style={{ fontSize: RATE_LABEL }}>
            {courts} {sport.toLowerCase()} {courts === 1 ? "court" : "courts"} &times;{" "}
            {modal / courts} {bandLabel.toLowerCase()} hours = {modal} court-hours on a typical day.
          </span>
        );
      })()}
    </div>
  );
}

const RATE_GRID = "grid gap-x-2 items-center px-4 py-[9px]";
const RATE_GRID_EASE = "grid-template-columns 480ms cubic-bezier(0.22,1,0.36,1)";

/* The first-slot data as a block rather than a column, for mobile.

   Before opening every sport shares one date, so listing all three would be
   the same line printed three times. It collapses to a single line whenever
   the labels agree and splits per sport once they diverge — which is what
   happens the moment the club is open and the courts book independently. */
function FirstSlotRow({
  slots,
  preOpening,
  pulse,
}: {
  slots: AvailabilityPayload["slots"];
  preOpening: boolean;
  pulse: string;
}) {
  // Nothing from the platform yet — better no block than an empty one.
  if (slots.length === 0) return null;

  const label = preOpening ? "First slot" : "Next free";
  const distinct = Array.from(new Set(slots.map((s) => `${s.label}${s.court ?? ""}`)));
  const uniform = distinct.length === 1;

  return (
    <div className="w-full border border-white/10 bg-white/[0.05] px-4 py-[11px] flex flex-col gap-[7px]">
      <span className="text-mono text-[0.56rem] text-white/45 flex items-center gap-[6px]">
        <span className="relative flex h-[6px] w-[6px] shrink-0">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping motion-reduce:animate-none"
            style={{ background: pulse }}
          />
          <span
            className="relative inline-flex rounded-full h-[6px] w-[6px]"
            style={{ background: pulse }}
          />
        </span>
        {label}
      </span>

      {uniform ? (
        <span
          className="text-cond tracking-[0.02em]"
          style={{ fontSize: "0.95rem", color: pulse }}
        >
          {slots[0].label}
          {slots[0].court && <span className="text-white/45"> · {slots[0].court}</span>}
        </span>
      ) : (
        <div className="flex flex-col gap-[5px]">
          {slots.map((s) => (
            <div
              key={s.sport}
              className="flex items-baseline justify-between gap-3"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              <span
                className="text-cond tracking-[0.03em]"
                style={{ fontSize: "0.86rem", color: "var(--ember-ink)" }}
              >
                {s.sport}
              </span>
              <span
                className="text-cond tracking-[0.02em] text-right"
                style={{ fontSize: "0.86rem", color: pulse }}
              >
                {s.label}
                {s.court && <span className="text-white/45"> · {s.court}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RateCard({ open, stacked }: { open: boolean; stacked: boolean }) {
  /* Which sports are still to come. Evaluated per render like isOpen(), so the
     line retires itself sport by sport across opening week with no deploy. */
  const pendingSports = sportsNotYetOpen(COURT_RATES.map((r) => r.sport));

  /* The week behind the hover panel. Client-side like the rate card's other
     live figure: it goes stale within the minute, so a server-rendered copy
     would be wrong for anyone who leaves the page open. Null until it lands,
     and null on any failure — the panel then shows the standing commitments
     instead, which is a complete answer rather than a broken one. */
  /* The full court-by-hour calendar, which is a second endpoint and a second
     question — see BookingsCalendar.tsx. Mounted always but inert until
     opened: it fetches nothing until then, so a visitor who never opens it
     pays nothing for it. */
  const [calOpen, setCalOpen] = useState(false);

  const [week, setWeek] = useState<CourtAvailability | null>(null);
  const [probe, setProbe] = useState<{ sport: string; band: string; label: string } | null>(null);
  /* Which of the two weeks the panel is showing. Deliberately NOT reset when
     the probe moves: comparing Wednesday across two sports means hovering one
     price then another, and snapping back to week one each time would make
     that impossible. It resets when the panel closes. */
  const [weekOffset, setWeekOffset] = useState(0);
  /* Which heatmaps are open on a phone. ALL THREE ON ARRIVAL.
     It shipped closed behind a chevron and the reply was "somehow don't see
     it on my phone" — a thing nobody opens is a thing nobody has. Opening
     just the first row was the next guess and also wrong: the answer is all
     of them, so the whole picture is simply there and the chevrons are only
     for putting one away.
     This DOES make the card long on a 375px screen, which is why it was one
     at a time to begin with. That was the wrong trade: a reader who has to
     tap to discover a feature mostly does not, and scrolling is cheap. */
  const [openSports, setOpenSports] = useState<string[]>(() => COURT_RATES.map((r) => r.sport));
  const toggleSport = (sport: string) =>
    setOpenSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]);
  useEffect(() => {
    let live = true;
    fetch("/api/court-availability")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: CourtAvailability | null) => { if (live && j?.days?.length) setWeek(j); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  /* No hover on a touch screen, and a price that silently does nothing when
     tapped is worse than a price. The cells stay plain spans when stacked. */
  const canProbe = !stacked && !!week;
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);

  // Fetched on the client rather than rendered on the server: the value goes
  // stale within the minute, so a server-rendered figure would be wrong for
  // anyone who leaves the page open.
  useEffect(() => {
    let live = true;
    fetch("/api/availability")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AvailabilityPayload | null) => live && setAvailability(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const preOpening = availability?.preOpening ?? true;
  const slotFor = (sport: string) =>
    availability?.slots.find((s) => s.sport === sport) ?? null;

  // Ember while the column is showing an opening date, green once the slots
  // are real and bookable — the same two-state signal the nav chip uses.
  const pulse = preOpening ? "var(--color-ember)" : "var(--color-green)";

  return (
    <motion.div
      className="w-full flex flex-col gap-3 mt-3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
      }}
    >
      <motion.div
        /* overflow-x-auto is the backstop the flex floor cannot be. Below
           roughly 1150px a hovered panel is still narrower than the table's
           own column minimums, and without this the panel's overflow:hidden
           silently amputates the peak price. Scrolling degrades; clipping
           lies. Same idiom the caps table in Footer.tsx already uses. */
        className="w-full border border-white/10 bg-white/[0.05] overflow-x-auto"
        variants={{
          hidden: { opacity: 0, y: 18 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
        }}
      >
        <div
          className={`${RATE_GRID} bg-white/[0.04] border-b border-white/[0.07]`}
          style={{ gridTemplateColumns: rateGrid(open), transition: RATE_GRID_EASE }}
        >
          <span className="text-mono text-white/45" style={{ fontSize: RATE_LABEL }}>Per hour</span>
          {/* Centred over their tracks, with the sport column left: the price
              columns are much wider than "$45", so left-aligned numbers sat
              hard against the sport name and left a gutter of dead space. */}
          {RATE_BANDS.map((b) => (
            <span key={b.key} className="text-mono text-white/45 text-center" style={{ fontSize: RATE_LABEL }}>
              {b.label}
            </span>
          ))}
          {/* overflow-hidden lets the track close over the label instead of
              the text spilling across the panel edge mid-transition. */}
          {/* Gated, not just faded: opacity 0 still leaves the label in the
              accessibility tree and in the served HTML. */}
          {SHOW_NEXT_SLOT && (
          <span
            className="text-mono text-white/45 flex items-center gap-[6px] overflow-hidden whitespace-nowrap transition-opacity duration-300"
            style={{ fontSize: RATE_LABEL, opacity: open ? 1 : 0 }}
          >
            {/* The one live figure in the card earns the pulse. */}
            <span className="relative flex h-[6px] w-[6px] shrink-0">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping motion-reduce:animate-none"
                style={{ background: pulse }}
              />
              <span
                className="relative inline-flex rounded-full h-[6px] w-[6px]"
                style={{ background: pulse }}
              />
            </span>
            {preOpening ? "First slot" : "Next free"}
          </span>
          )}
        </div>

        {COURT_RATES.map((r, i) => (
          <Fragment key={r.sport}>
          <div
            className={`${RATE_GRID} ${
              i < COURT_RATES.length - 1 ? "border-b border-white/[0.07]" : ""
            }`}
            style={{
              fontVariantNumeric: "tabular-nums",
              gridTemplateColumns: rateGrid(open),
              transition: RATE_GRID_EASE,
            }}
          >
            {/* On a phone the sport name is the control that opens its
                heatmap — the whole row, effectively, since the name is the
                only wide target in it. The 15px squares are NOT tappable and
                are not meant to be: booking lives on the floating button, so
                the grid stays a read. */}
            {stacked && week ? (
              <button
                type="button"
                className="text-cond tracking-[0.03em] text-left flex items-center gap-1.5 focus:outline-none"
                style={{ fontSize: RATE_SPORT, color: "var(--ember-ink)" }}
                aria-expanded={openSports.includes(r.sport)}
                aria-label={`${openSports.includes(r.sport) ? "Hide" : "Show"} ${r.sport} availability`}
                onClick={() => toggleSport(r.sport)}
              >
                {r.sport}
                {/* ⚠️ THIS WAS 8px AT 0.55 OPACITY AND NOBODY FOUND IT.
                    Reported 2026-10-02: "somehow don't see it on my phone" —
                    the heatmap worked, the control announcing it did not. It
                    is now full-strength ember in a bordered box, because on a
                    phone the ONLY thing saying this row does something is
                    this mark; there is no hover to discover it with. */}
                <span
                  className="inline-flex items-center justify-center rounded-[2px] transition-transform duration-200"
                  style={{
                    width: "1.05em",
                    height: "1.05em",
                    fontSize: "0.62em",
                    color: "var(--color-ember)",
                    border: "1px solid color-mix(in srgb, var(--color-ember) 45%, transparent)",
                    transform: openSports.includes(r.sport) ? "rotate(90deg)" : "none",
                  }}
                >
                  {"›"}
                </span>
              </button>
            ) : (
              <span
                className="text-cond tracking-[0.03em]"
                style={{ fontSize: RATE_SPORT, color: "var(--ember-ink)" }}
              >
                {r.sport}
              </span>
            )}
            {RATE_BANDS.map((b) => {
              // Peak is the price most people will actually pay, so it is the
              // one that reads at full strength.
              const tone = b.key === "peak" ? "text-white" : "text-white/[0.72]";
              /* Marked from state so the cell keeps saying which week is on
                 screen once the pointer has travelled down to the panel. */
              const active = probe?.sport === r.sport && probe?.band === b.key;
              /* EVERY PRICE IS A BOOKING LINK, at Aniket's instruction
                 2026-10-02. Hover still reveals that cell's week in the panel
                 below; the click goes to the platform. Note this deliberately
                 bypasses bookingTarget(), which before opening sends people to
                 the mailing list rather than "a login screen for a club with
                 no slots" — that trade was overruled: the prices should lead
                 to the booking page whether or not the doors are open yet. */
              return (
                <a
                  key={b.key}
                  href={BOOK_COURTS_URL}
                  target="_blank"
                  rel="noreferrer"
                  /* ⚠️ THE ACTIVE CELL IS MARKED FROM STATE, NOT :hover. The
                     highlight used to be CSS-only, so the moment the pointer
                     travelled down to the panel the cell it came from went
                     plain and you could no longer tell which of nine prices
                     the week belonged to. The panel keeps showing it, so the
                     cell must keep saying so. */
                  className={`font-medium ${tone} block text-center -mx-1 px-1 py-[2px] rounded-[3px] border no-underline focus:outline-none transition-colors ${
                    active
                      ? ""
                      : "border-transparent hover:border-[var(--color-ember)]/45 hover:bg-[var(--color-ember)]/10 focus-visible:border-[var(--color-ember)] focus-visible:bg-[var(--color-ember)]/10"
                  }`}
                  /* Inline, not a Tailwind class. `bg-[var(--color-ember)]/15`
                     and `border-[var(--color-ember)]` were emitted into the
                     markup but computed to transparent — an opacity modifier
                     on a bare var() colour does not survive the JIT here.
                     Measured 2026-10-02; the class was present and the paint
                     was not. Inline cannot fail that way. */
                  style={
                    active
                      ? {
                          fontSize: RATE_PRICE,
                          borderColor: "var(--color-ember)",
                          background: "color-mix(in srgb, var(--color-ember) 16%, transparent)",
                        }
                      : { fontSize: RATE_PRICE }
                  }
                  aria-label={`Book a ${r.sport} court — ${b.label}, $${r[b.key]} an hour`}
                  onMouseEnter={() => canProbe && setProbe({ sport: r.sport, band: b.key, label: b.label })}
                  onFocus={() => canProbe && setProbe({ sport: r.sport, band: b.key, label: b.label })}
                >
                  ${r[b.key]}
                </a>
              );
            })}
            <span
              className="text-cond tracking-[0.02em] whitespace-nowrap overflow-hidden transition-opacity duration-300"
              style={{
                fontSize: RATE_PRICE,
                color: slotFor(r.sport) ? pulse : "rgba(128,140,155,0.55)",
                opacity: open ? 1 : 0,
              }}
            >
              {/* An em dash while the fetch is in flight, or when the platform
                  has nothing for this sport — never a blank cell. */}
              {slotFor(r.sport)?.label ?? "—"}
              {slotFor(r.sport)?.court && (
                <span className="text-white/45"> · {slotFor(r.sport)!.court}</span>
              )}
            </span>
          </div>
          {stacked && week && openSports.includes(r.sport) && (
            <MobileHeat
              sport={r.sport}
              data={week}
              offset={weekOffset}
              onOffset={setWeekOffset}
            />
          )}
          </Fragment>
        ))}
      </motion.div>

      {/* Mobile only — the column has nowhere to open on a 375px panel, so
          the same data gets its own block under the table. */}
      {SHOW_NEXT_SLOT && stacked && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          <FirstSlotRow
            slots={availability?.slots ?? []}
            preOpening={preOpening}
            pulse={pulse}
          />
        </motion.div>
      )}

      <motion.p
        className="text-white/40"
        style={{ fontSize: RATE_NOTE }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.5 } },
        }}
      >
        {RATE_FOOTNOTE}
        {/* A brighter <span> carrying RATE_FEES_NOTE followed this until
            2026-09-30 — "Stripe fee (2.9% + 30¢) not included." — set a shade
            brighter than the rest because it was the one clause that changed
            what the reader would actually be charged. Exton now absorbs the
            card fee on courts as well as classes, so there is no longer any
            such clause: the rate card IS the price. See lib/rates.ts, where
            the constant used to live, before adding a fee line back here. */}
      </motion.p>

      {/* ── Book, and who already has the floor ─────────────────────────
          Restored 2026-10-02. A "Join the waitlist" / "See the courts" pair
          used to live in the hero copy column and was removed on 2026-10-01 —
          which quietly took the LAST booking CTA off the homepage, four days
          before the doors open. It comes back here instead of there on
          purpose: this is the block a reader is in when they have just read
          "$45", so it is the shortest distance between the price and the act.

          Underneath it, the commitment timetable rather than an availability
          feed. See lib/floor.ts for why that choice was made against real
          data: with ten courts and an empty calendar, every honest
          availability figure in opening week reads "everything is free",
          which lands as "nobody goes here". This says something true that is
          still worth reading on a quiet Tuesday, and costs no platform call. */}
      <motion.div
        className="w-full border-t border-white/10 pt-4 flex flex-col gap-3.5"
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
        }}
      >
        {/* On a phone the button goes full width and the status drops under
            it; side by side they would each get about 150px and the status
            would wrap to three lines. */}
        <div className={stacked ? "flex flex-col gap-2.5" : "flex flex-wrap items-center gap-x-4 gap-y-2.5"}>
          {/* ONE CTA, ALWAYS THE BOOKING PAGE. The pre-opening branch used to
              offer the mailing list instead, on the reasoning that there is
              nothing to book yet and a login screen for a club with no slots
              is a dead end. Removed 2026-10-02 at Aniket's instruction: every
              price in the table above is now a booking link too, so a CTA
              pointing somewhere else was the odd one out. bookingTarget() is
              consequently no longer consulted here. */}
          <a
            href={BOOK_COURTS_URL}
            target="_blank"
            rel="noreferrer"
            className={`text-mono bg-[var(--color-ember)] text-black border border-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] hover:border-[var(--color-ember-hi)] transition-colors ${
              stacked ? "block text-center py-[13px] px-5" : "inline-block py-[11px] px-[22px]"
            }`}
            style={{ fontSize: RATE_LABEL }}
          >
            Book a court
          </a>

          {/* The whole floor, hour by hour. It sits next to the CTA rather
              than under the heatmap on purpose: the heatmap answers "how busy
              is the week", this answers "can I have court 3 at six", and the
              second question is the one somebody who has just read a price is
              actually asking.

              A button, not a link: there is no /calendar page to point at —
              it opens an overlay over this one.

              OUTLINED, NOT FILLED, and the same height and padding as the
              ember CTA beside it. It reads as the pair it is — look, then
              book — where a second solid ember block would have two primary
              actions competing a centimetre apart. Same shape as the
              outlined half of DetailAction above. */}
          <button
            type="button"
            onClick={() => setCalOpen(true)}
            className={`text-mono text-[var(--color-ember)] border border-[var(--color-ember)]/50 hover:border-[var(--color-ember)] hover:text-white transition-colors ${
              stacked ? "block w-full text-center py-[13px] px-5" : "inline-block py-[11px] px-[22px]"
            }`}
            style={{ fontSize: RATE_LABEL }}
          >
            Show calendar of bookings
          </button>
          <BookingsCalendar open={calOpen} onClose={() => setCalOpen(false)} />

          {/* ⚠️ THE THREE SPORTS DO NOT OPEN TOGETHER, so this cannot be one
              date. The doors are Mon 5 Oct but the courts come online across
              that week — squash 5th, badminton 6th, cricket 8th — and a single
              "Booking opens Monday" line was telling two thirds of readers the
              wrong thing. It collapses to "Open now" only once every sport is
              live, so the staged week states itself and then stops. */}
          <span
            className={`flex gap-2 text-white/70 ${stacked ? "items-start" : "items-center"}`}
            style={{ fontSize: RATE_NOTE }}
          >
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: "7px",
                height: "7px",
                marginTop: stacked ? "0.45em" : undefined,
                background: pendingSports.length === 0 ? "var(--color-green)" : "var(--color-ember)",
              }}
            />
            {pendingSports.length === 0 ? (
              <span>
                {/* The {" "} is load-bearing: JSX drops the literal space that
                    follows an expression container, which rendered "Open now·
                    any hour". Same trap About.tsx documents for LEGAL_NAME. */}
                <span className="text-white">Open now</span>{" "}&middot; any hour, day or night
              </span>
            ) : (
              <span>
                {COURT_RATES.map((r, i) => (
                  <span key={r.sport}>
                    {i > 0 && " · "}
                    <span className="text-white">{r.sport}</span>{" "}
                    {sportBookingOpen(r.sport)
                      ? "open now"
                      : `from ${SPORT_BOOKING_OPENS_LABEL[r.sport] ?? "soon"}`}
                  </span>
                ))}
              </span>
            )}
          </span>
        </div>

        {/* ── The panel ────────────────────────────────────────────────────
            On hover or focus of a price: that sport and band across the week.
            At rest: nothing but the hint that says so.

            The commitment timetable from lib/floor.ts used to sit here at
            rest — who holds which courts, in words. Removed 2026-10-05 at
            Aniket's instruction: the calendar of bookings now draws the same
            contracts as blocks on the actual grid, so the paragraph was
            saying a second time, less precisely, what a reader can see.

            ⚠️ THE MIN-HEIGHT STAYS. It is not leftover from that block — it
            reserves the WEEK STRIP's height, which is the taller of the two
            states, so the rows below do not jump the moment a price is
            hovered. Removing it trades a little whitespace at rest for a
            shifting page under the pointer. */}
        <div
          className="flex flex-col gap-2 pt-0.5"
          style={{ minHeight: canProbe ? "118px" : undefined }}
          onMouseLeave={() => { setProbe(null); setWeekOffset(0); }}
        >
          {canProbe && probe && week ? (
            <WeekStrip
              sport={probe.sport}
              bandKey={probe.band}
              bandLabel={probe.label}
              data={week}
              offset={weekOffset}
              onOffset={setWeekOffset}
            />
          ) : (
          /* The hover and tap hints, which used to ride on the end of the
             commitment timetable's footnote.
             ⚠️ THEY OUTLIVED THAT BLOCK ON PURPOSE. The phone had NO
             equivalent of the hover hint, so the accordion was
             undiscoverable: no pointer to reveal it, and a mark too faint to
             read as a control. canProbe is `!stacked && week`, so the two are
             mutually exclusive and only ever one shows. */
          <span className="text-white/30" style={{ fontSize: RATE_NOTE }}>
            {canProbe
              ? "Hover a price for the week."
              : stacked && week
                ? "Tap a sport to collapse it."
                : null}
          </span>
          )}
        </div>
      </motion.div>

      {/* Bulk bookings — leagues and corporate hire are a phone call, not a
          checkout, so they get a line of their own rather than a fourth CTA. */}
      <motion.div
        className="w-full border-t border-white/10 pt-3 flex flex-wrap items-baseline gap-x-[14px] gap-y-2"
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
        }}
      >
        <span
          className="text-mono text-[var(--color-ember)]"
          style={{ fontSize: RATE_LABEL }}
        >
          Bulk &amp; block bookings
        </span>
        <span className="text-white/60" style={{ fontSize: RATE_BODY }}>
          Leagues, corporate nights, school groups and full-venue hire —{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-white border-b border-[var(--color-ember)]/55 hover:border-[var(--color-ember)] transition-colors"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          or{" "}
          <a
            href={`tel:${CONTACT_PHONE_E164}`}
            className="text-white border-b border-[var(--color-ember)]/55 hover:border-[var(--color-ember)] transition-colors whitespace-nowrap"
          >
            {CONTACT_PHONE}
          </a>
          .
        </span>
        {/*
          ⚠️ A2P 10DLC DISCLOSURE — THE SECOND PLACE THE NUMBER IS ADVERTISED.

          The contact block in About.tsx already carries this, and its comment says the
          consent language must sit BESIDE the number because a reviewer opens the
          homepage, finds the number and looks for consent right there. That reasoning
          applies to every occurrence, and this one was missed: until 2026-09-30 the
          homepage printed the number TWICE and only the lower one was disclosed. The
          bare one is HIGHER on the page, so it is the first a crawler and a reader meet.

          That mattered concretely. The A2P campaign filed on 2026-09-30 told the reviewer
          the number is "advertised on our website with this disclosure beside it" — a
          statement that was false of the first occurrence. The campaign was rejected
          (30908/30882). Whether this was a cause is unproven, but a filing must not
          describe a page that does not exist.

          Shorter than the About.tsx copy on purpose — this is a marketing panel, not the
          contact block — but the load-bearing clauses are all here and all match
          app/sms/page.tsx: agreeing to receive, the named entity, what we send, cost,
          STOP, and now BOTH policy links. Change them together or not at all.

          The {" "} after LEGAL_NAME is deliberate: JSX drops the literal space following
          an expression, which rendered "EXTON LLCabout" when About.tsx first did this.
        */}
        <span className="text-white/35 mt-2 block" style={{ fontSize: RATE_NOTE }}>
          By calling or texting that number you are agreeing to receive text message
          replies from {LEGAL_NAME}{" "}
          about membership, visits and court availability. We only reply and never text
          first. Msg &amp; data rates may apply. Reply STOP to opt out, or HELP for help.
          See our{" "}
          <a href="/sms" className="underline hover:text-[var(--color-ember)] transition">
            SMS Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-[var(--color-ember)] transition">
            Privacy Policy
          </a>
          .
        </span>
      </motion.div>

      {/* The "Join the waitlist" / "See the courts" pair was removed 2026-10-01.
          The rate card already carries the booking route, and the club is days
          from opening, so a waitlist CTA was selling the wrong action. Removing
          this orphaned `book` here and the BOOK_COURTS_URL/bookingTarget import
          at the top of the file — restore all three together if it comes back. */}
    </motion.div>
  );
}

/* How far the outermost letters of the background wordmark travel from their
   set position, in px. The middle letter stays put and the ones between get a
   proportion, so the word opens and closes rather than shearing. */
const LETTER_SPREAD = 72;

/* ─── Content config ───────────────────────────────────────────── */

/* One panel for both halves. Four verbs across two lines: the studio's two
   first, then the academies' two, so the line that lands in ember is the
   competitive half. "Train. / Move." alone spoke for the studio and left the
   academies' point — that these are pathways, not drop-ins — unsaid. */
const ACADEMIES = {
  bigWord: "EXTON",
  bg: "var(--hero-aca-bg)",
  label: "Academies · Studio",
  headline: { line1: "Train. Move.", line2: "Learn. Compete." },
  body: "Structured coaching in cricket, squash and badminton. Dance and fitness on the studio floor. All levels, no partner needed.",
  cta: "Explore academies",
};

/* Bollywood is real and dated; the rest is honestly labelled as not yet
   running. Saying "coming soon" beats inventing a timetable, and it matches
   how the academies panel already handles its two unlaunched partners. */
const STUDIO_CLASSES: {
  /** Also the PLATFORM's squad_programs.name — the schedule is matched on it,
      so this string may not be renamed without breaking the timetable. */
  name: string
  /** Display headline, when the class is branded differently from the row. */
  title?: string
  logo?: React.ReactNode
  /** Qualitative eyebrow ("All levels · no experience needed"). Timing belongs
      in `schedule`, which renders in the right-hand column. */
  when?: string
  desc: string
  blurb?: string
  action?: { label: string; href: string }
  book?: { label: string; href: string }
  /** Self-serve registration, rendered as a Register button at the foot of the
      SCHEDULE column rather than beside the blurb. Gated by RegisterCta on
      CLASS_ONLINE_BOOKING_LIVE. Only classes whose bookings are managed on
      app.orangish.io set this. */
  registerHref?: string
  schedule?: { startsOn?: string; when?: string; status?: string }
}[] = [
  { name: "Bollywood Fitness",
    /* Renamed from "Bollywood Dance" on 2026-09-20 at the operator's request.
       ⚠️ THIS STRING IS A JOIN KEY, not just a label: RosterDetail matches it
       against `program` from /api/schedule, which is squad_programs.name on the
       platform. The programme was renamed there in the same change. Rename one
       without the other and the class quietly loses its schedule, price and
       packs — the panel still renders, just with nothing live in it. The brand
       goes in the detail, exactly as the academies do it: roster says CRICKET,
       the panel says Chester County Cricket. */
    title: "Bombay Jam",
    when: "All levels · no experience needed",
    desc: "Filmi routines and bhangra footwork, with a proper warm-up. All levels, no partner needed.",
    /* Every clause is off SeRa Fitness's own class flyer: "A FUN BOLLYWOOD
       INSPIRED DANCE FITNESS WORKOUT", "High energy. Easy to follow. All
       fitness levels welcome!", and "COME FOR THE WORKOUT, STAY FOR THE
       VIBES!". Nothing here is invented. */
    blurb:
      "A fun, Bollywood-inspired dance fitness workout from SeRa Fitness. High energy, easy to follow, and all fitness levels are welcome — come for the workout, stay for the vibes.",
    /* The flyer's own registration route ("CALL TO REGISTER"), which beats the
       waitlist: it is a line that actually takes bookings today. Still not a
       platform deep-link — anonymous enrolment 401s and Exton is
       public_join:false with access_paused:true. */
    action: { label: "Call to register", href: "tel:+12019252710" },
    /* Added once the platform could actually take this booking: orangish-app
       #553 lets somebody with no membership reach the class list and enrol, and
       #554 sells them the 4- and 8-session packs — the thing a phone call
       cannot do. The phone line stays because it is the only route that needs no
       account at all, and it is what the flyer prints.

       ⛔ DELIBERATELY NOT bookingTarget(). Every other CTA on this site falls
       back to the waitlist until isOpen(), and that is right for a court that
       does not exist yet — but this class runs on Sep 15, before the club's
       general opening, and is taking bookings today. Gating it would send the
       one programme that IS live to a waitlist. The phone CTA above is ungated
       for exactly the same reason.

       ⛔ HIDDEN since 2026-09-09 — CLASS_ONLINE_BOOKING_LIVE is false while the
       registration path goes untested end to end. `book` undefined makes
       DetailAction render the phone CTA alone, which is the pre-#28 behaviour
       and still takes bookings. Flip the constant in lib/booking.ts to restore
       it; the checklist for doing so is on that constant. */
    /* ⛔ `book` stays undefined: the online route moved to the SCHEDULE COLUMN on
       2026-10-05, so there is one Register button per class and it sits to the
       right, beside the times — see registerHref below and RegisterCta. Leaving
       it here too would print two buttons to the same page. "Call to register"
       above is unaffected and still the account-free route the flyer prints. */
    registerHref: BOLLYWOOD_CLASS_URL,
    /* A wordmark in the site's own materials rather than the flyer artwork: the
       flyer is a portrait raster with a photograph in it and would not survive
       being dropped into a dark panel at 84px. The script/caps split mirrors
       how the flyer sets it; Caveat came in for smash!shuttler and now carries
       this card alone. */
    logo: (
      <span className="flex items-baseline gap-[9px]">
        <span
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontWeight: 700,
            fontSize: "clamp(2.1rem, 2.7vw, 3.6rem)",
            lineHeight: 1,
            color: "var(--ember-ink)",
          }}
        >
          SeRa
        </span>
        <span
          className="text-cond"
          style={{
            fontSize: "clamp(0.78rem, 0.95vw, 1.15rem)",
            letterSpacing: "0.26em",
            color: "var(--on-tile)",
          }}
        >
          FITNESS
        </span>
      </span>
    ) },
];


const RECREATION = {
  bigWord: "EXTON",
  bg: "var(--hero-rec-bg)",
  label: "No membership required",
  headline: { line1: "Book a court.", line2: "Pay by the hour." },
  body: "Squash, badminton and cricket. Open 24×7. Anyone can book.",
  cta: "Book a court",
};

/* Academy partner logos — accurate fonts per brand.
   Philadelphia Badminton: Space Grotesk 700   "Philadelphia" orange · "Badminton" white
   SquashTigers:  Exo 2 800 italic      "squash" white · "tigers" orange
   Chester County Cricket Academy ships a crest rather than a wordmark, and
   has no brand webfont, so it is a cropped shield image plus the name set in
   the site's own condensed face. Cropping to the shield keeps all three marks
   at the same optical weight — the full badge is roughly twice as tall. */
/* ── THE CRICKET ACADEMY START DATE — ONE PLACE ──────────────────────────────
   Every mention of it on this site is computed from the two constants below.
   It used to be written twice: once as a Date driving the roster intro, and once
   as the literal string "Coming Oct 12th" in the Chester County entry. Two
   statements of one fact drift the moment somebody moves the date and updates
   only the one they happened to be looking at — and this date has already moved
   once, from Oct 7 to Oct 12 on 2026-10-02.

   Change the date here and the roster line, the academy chip and the detail
   panel all follow. Nothing else on the site names it.

   ⛔ NOT THE SAME AS lib/opening.ts SPORT_BOOKING_OPENS.Cricket (Thu 8 Oct).
   That is when the cricket LANES become bookable by anyone; this is when the
   ACADEMY that holds two of them starts running. The lanes open four days first,
   and that file's own header warns about exactly this confusion. */
const CRICKET_ACADEMY_OPENS = new Date("2026-10-12T06:00:00-04:00");

/* How the date is written wherever a reader sees it. Aniket's wording,
   2026-10-05 — day-of-month before weekday, which is not the order the rest of
   the site uses, so it is set here once rather than re-derived and re-argued. */
const CRICKET_ACADEMY_LABEL = "Oct 12th, Monday";

function cricketAcademyOpen(now: Date = new Date()): boolean {
  return now.getTime() >= CRICKET_ACADEMY_OPENS.getTime();
}

/* The chip on the Chester County row, and in its detail panel. */
function cricketAcademyStatus(now: Date = new Date()): string {
  return cricketAcademyOpen(now) ? "Enrolling now" : `Coming ${CRICKET_ACADEMY_LABEL}`;
}

/* The line the detail column shows before you point at anything.
   ───────────────────────────────────────────────────────────────────────────
   It used to read "squash takes trials now, cricket and badminton follow when
   the doors open". The doors opened on 5 October and badminton started the same
   day — Philadelphia Badminton played its first contracted hours that evening —
   so the sentence was describing a club that no longer existed. Squash was also
   never the only one "taking trials": SquashTigers has been enrolling and
   Junior Squad is running five sessions a week.

   Computed now, off the one date still in the future. On 12 October the cricket
   clause disappears by itself and the line becomes "all three take players now".
   Nothing needs editing that day — which is the point, because the last version
   of this sentence went stale silently and sat wrong for a week. */
function rosterIntro(now: Date = new Date()): string {
  const head = cricketAcademyOpen(now)
    ? "all three take players now"
    : `squash and badminton take players now, cricket from ${CRICKET_ACADEMY_LABEL}`;
  return `Coaching runs through three academies rather than the club itself — ${head}. The studio floor is the club's own: dance and fitness, all levels.`;
}

const ACADEMY_PARTNERS = [
  {
    name: "Chester County Cricket Academy",
    href: "https://cccricketacademy.com",
    short: "Cricket",
    sport: "Cricket academy",
    /* Was "Starts Sep 28 · 7 days a week" until 2026-09-24, then "Coming soon"
       while the building's own opening moved to Oct 5 and no academy date was
       settled. Both dates are real and confirmed by Aniket: badminton Oct 5,
       cricket Oct 12 — moved from Oct 7 on 2026-10-02, a week after the doors.
       They are NOT the same date and the later one is cricket — easy to
       transpose, so check with him before "correcting" either.
       Still no platform programme for cricket: squad_programs has one active
       row at Exton and it is the dance class. This stays local copy in the
       shape the platform feed produces, so the day cricket IS entered in
       /admin/squads the live data takes over with no markup change. */
    schedule: { status: cricketAcademyStatus() },
    /* Near-verbatim from cccricketacademy.com. Deliberately NOT saying more:
       their site gives no founding year, and its published indoor season runs
       Oct-Mar at All-Star Sports Academy in Downingtown with outdoor sessions
       at Exton Park in MALVERN — which is not this building. Any start date we
       print here is Exton's own announcement, not theirs. */
    blurb:
      "High-quality cricket coaching for aspiring cricketers of all ages and skill levels, with junior enrolments open for girls and boys.",
    /* No trial: the platform has no trial concept at all, and CCCA runs its own
       enrolment. The address is the honest ask. */
    /* Was a mailto to cricket@extonsports.com. Now that CCCA is signed and has a
       date, the useful next step is their own site rather than an enquiry form
       we then have to forward. Same treatment as badminton below. */
    action: { label: "Learn more", href: "https://cccricketacademy.com" },
    // No cta: the site link lives on the logo and there is nothing else to
    // send a reader to until the academy opens, so the tile offers the
    // address instead of a button.
    email: "cricket@extonsports.com",
    logo: (
      <span className="flex items-center gap-[9px]">
        <Image
          src="/academies/ccca-shield.png"
          alt=""
          width={360}
          height={239}
          className="w-auto shrink-0"
          style={{ height: "clamp(68px, 4.4vw, 124px)" }}
          priority
        />
        {/* "Academy" is left off deliberately — the tile's own sport label
            directly below already says "Cricket academy". */}
        <span
          className="text-cond leading-[1.05]"
          /* Sized to land alongside the SeRa wordmark, which caps at 3.6rem.
             This is a TWO-LINE stacked lockup against SeRa's single line, so
             matching means matching the per-line type, not the block height —
             at 2560 both resolve to roughly 56px. The crest scales with it so
             the lockup keeps its balance. */
          style={{ fontSize: "clamp(1.7rem, 2.2vw, 3.4rem)", letterSpacing: "0.04em" }}
        >
          <span className="block text-[var(--color-ember)]">Chester County</span>
          <span className="block text-white">Cricket</span>
        </span>
      </span>
    ),
  },
  {
    name: "SquashTigers",
    href: "https://squashtigers.com",
    short: "Squash",
    sport: "Squash academy",
    desc: "High performance junior squash academy with locations in NJ, PA and CT (forthcoming).",
    /* There IS a timetable now — see lib/squad-schedule.ts, rendered as the
       schedule column by AcademyDetail.

       It used to say: no timetable, because squashtigers.com's published pattern
       is a GROUP-WIDE statement across NJ/PA/CT qualified with "when school is in
       session", so printing it as an Exton schedule would have been wrong. That
       was correct and is now spent: as of 2026-10-05 the platform holds a real
       Exton programme (squad_programs `Junior Squad`, 55 dated sessions holding
       three squash courts). The table states THAT, not the national pattern.

       The status line survives alongside it — "when does it begin" is still a
       question a weekly pattern does not answer. */
    schedule: { status: "Enrolling now" },
    /* The one row with a real trial behind it. Both sentences are sourced from
       squashtigers.com — the second is their FAQ answer almost verbatim. */
    blurb:
      "A year-round junior squash academy across NJ, PA and CT, with Exton as its Pennsylvania home. A free trial gets the player assessed and placed in a group.",
    /* Deep-links to the FORM, not the homepage, which is where the old CTA
       landed. That form carries an "Exton, PA" location checkbox, so someone
       arriving from here can say where they mean in one click. */
    action: { label: "Register for a Trial", href: "https://www.squashtigers.com/#contact" },
    logo: (
      <span
        style={{
          fontFamily: "var(--font-exo2), sans-serif",
          fontWeight: 800,
          fontStyle: "italic",
          fontSize: "clamp(1.85rem, 2.4vw, 3.2rem)",
          letterSpacing: "0.06em",
        }}
      >
        <span style={{ color: "var(--on-tile)" }}>SQUASH</span>
        <span style={{ color: "var(--ember-ink)" }}>TIGERS</span>
      </span>
    ),
  },
  {
    /* Replaced SmashShuttler 2026-09-24 — the court licence is signed with
       Philadelphia Badminton, so the whole row is theirs now. */
    name: "Philadelphia Badminton",
    href: "https://philadelphiabadminton.com",
    short: "Badminton",
    sport: "Badminton academy",
    /* No schedule column: this row renders the real timetable as a table
       instead — see PbaScheduleTable. The old `schedule: { status: "Coming
       Oct 5th" }` went on 2026-10-05, the morning it became false. */
    /* Their own programme copy, near-verbatim, plus their coach roster. NOT
       said: "Pennsylvania's largest badminton facility" and the 12 mat courts
       are their Norristown building, not this one. Nor is this juniors-only,
       which is what the SmashShuttler line claimed. */
    blurb:
      "Structured, goal-oriented private and small-group coaching for all ages and levels, from BWF- and USAB-certified coaches.",
    action: { label: "Learn more", href: "https://philadelphiabadminton.com" },
    logo: (
      /* Their hero sets the name over two lines in Space Grotesk 700; this is
         that mark, split across the tile's two colours like the cricket one. */
      <span
        className="leading-[1.05]"
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 700,
          fontSize: "clamp(1.5rem, 1.95vw, 2.6rem)",
          letterSpacing: "-0.02em",
        }}
      >
        <span className="block" style={{ color: "var(--ember-ink)" }}>Philadelphia</span>
        <span className="block" style={{ color: "var(--on-tile)" }}>Badminton</span>
      </span>
    ),
  },
];

/* The roster, in the order it reads on the page. Built from the two sources
   rather than duplicating them, so adding an academy or a class shows up in the
   list, the detail column and the mobile stack at once.

   `href` is what separates the groups behaviourally: academies have their own
   sites to link to, studio classes do not. */
const ROSTER_GROUPS: {
  label: string;
  items: { id: string; short: string; href?: string }[];
}[] = [
  {
    label: "Academies",
    items: ACADEMY_PARTNERS.map((a) => ({
      id: a.name,
      short: a.short,
      href: a.href,
    })),
  },
  {
    label: "Studio",
    items: STUDIO_CLASSES.map((c) => ({ id: c.name, short: c.name })),
  },
];
