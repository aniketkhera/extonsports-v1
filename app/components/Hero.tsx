"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import type { AvailabilityPayload } from "../api/availability/route";
import type { SchedulePayload } from "../api/schedule/route";
import type { ProgramSchedule } from "@/lib/club-schedule";
import { COURT_RATES, RATE_BANDS, RATE_FOOTNOTE, RATE_FEES_NOTE } from "../../lib/rates";
import { BOOK_COURTS_URL, bookingTarget } from "../../lib/booking";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_E164 } from "../../lib/legal";

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
              <p className="m-0 text-white/35 mt-1" style={{ fontSize: RATE_NOTE }}>
                Coaching runs through the club&apos;s academies.
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
                      {ROSTER_INTRO}
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
}: {
  blurb?: string;
  schedule: DetailSchedule | null;
  action?: { label: string; href: string };
}) {
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
        <DetailAction action={action} />
      </div>
      <ScheduleLine schedule={schedule} />
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
function ScheduleLine({ schedule }: { schedule: DetailSchedule | null }) {
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

          STICKER PRICES, matching the court rate card three panels away and the
          Studio's own flyer. RATE_FEES_NOTE below is the same sentence the rate
          card carries, for the same reason: Exton passes the Stripe fee on, so
          $80 is $82.70 at checkout, and one disclosure covering both products
          beats two conventions on one page. */}
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
          <div className="text-white/35 text-[0.75rem] mt-1">{RATE_FEES_NOTE}</div>
        </div>
      )}
      {schedule.full && (
        <div className="text-[var(--color-ember)] text-mono text-[0.62rem] mt-2">
          Currently full
        </div>
      )}
    </div>
  );
}

/* The one CTA per row. Every destination is somewhere that actually accepts the
   thing its label promises — see the per-row comments in the data below. */
function DetailAction({ action }: { action?: { label: string; href: string } }) {
  if (!action) return null;
  const external = action.href.startsWith("http");
  return (
    <a
      href={action.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-block mt-5 text-[var(--color-ember)] hover:text-white text-mono text-[0.7rem] transition-colors"
    >
      <span className="border border-[var(--color-ember)]/50 px-5 py-2.5">
        {action.label} &rarr;
      </span>
    </a>
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
      />
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
  return (
    <div>
      <span className="block leading-none mb-4">{ac.logo}</span>
      <span className="block text-mono text-[0.64rem] tracking-[0.18em] uppercase text-[var(--color-ember)]">
        {ac.sport}
      </span>
      {/* Status first and small — "Coming Sep 28th" is a fact about timing, not
          a description — then the blurb underneath it. */}
      {desc && desc !== blurb && (
        <p className="text-white/45 text-[0.82rem] leading-[1.5] mt-2 mb-0">{desc}</p>
      )}
      {/* 60ch, not 48. The column is far wider than the tile this copy was
          sized for, and a short measure in a wide box is what was leaving half
          the panel empty. 60ch is still inside the 45-75 readable range. */}
      <DetailBody blurb={blurb} schedule={schedule} action={action} />
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
  const book = bookingTarget(BOOK_COURTS_URL);
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
          {RATE_BANDS.map((b) => (
            <span key={b.key} className="text-mono text-white/45" style={{ fontSize: RATE_LABEL }}>
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
          <div
            key={r.sport}
            className={`${RATE_GRID} ${
              i < COURT_RATES.length - 1 ? "border-b border-white/[0.07]" : ""
            }`}
            style={{
              fontVariantNumeric: "tabular-nums",
              gridTemplateColumns: rateGrid(open),
              transition: RATE_GRID_EASE,
            }}
          >
            <span
              className="text-cond tracking-[0.03em]"
              style={{ fontSize: RATE_SPORT, color: "var(--ember-ink)" }}
            >
              {r.sport}
            </span>
            {RATE_BANDS.map((b) => (
              <span
                key={b.key}
                className={`font-medium ${
                  // Peak is the price most people will actually pay, so it is
                  // the one that reads at full strength.
                  b.key === "peak" ? "text-white" : "text-white/[0.72]"
                }`}
                style={{ fontSize: RATE_PRICE }}
              >
                ${r[b.key]}
              </span>
            ))}
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
        {RATE_FOOTNOTE}{" "}
        {/* Set a shade brighter than the rest of the footnote: it is the one
            clause that changes what the reader will actually be charged, and
            at 40% it read as small print about small print. */}
        <span className="text-white/60">{RATE_FEES_NOTE}</span>
      </motion.p>

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
      </motion.div>

      <motion.div
        className="flex flex-wrap items-center gap-[10px] pt-1"
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
        }}
      >
        <a
          href={book.href}
          {...(book.external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="text-mono text-[0.66rem] px-[18px] py-[9px] bg-[var(--color-ember)] text-black border border-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] hover:border-[var(--color-ember-hi)] transition-colors"
        >
          {book.external ? "Book a court" : "Join the waitlist"}
        </a>
        <a
          href="#sports"
          className="text-mono text-[0.66rem] px-[18px] py-[9px] text-[var(--color-ember)] border border-[var(--color-ember)]/50 hover:border-[var(--color-ember)] hover:bg-[var(--color-ember)]/10 transition-colors"
        >
          See the courts
        </a>
      </motion.div>
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
  schedule?: { startsOn?: string; when?: string; status?: string }
}[] = [
  { name: "Bollywood Dance",
    /* The row stays "Bollywood Dance" — it is what the platform calls the
       program AND what a reader scanning a roster understands. The brand goes
       in the detail, exactly as the academies do it: roster says CRICKET, the
       panel says Chester County Cricket. */
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
    /* A wordmark in the site's own materials rather than the flyer artwork: the
       flyer is a portrait raster with a photograph in it and would not survive
       being dropped into a dark panel at 84px. Caveat is already loaded for
       smash!shuttler, and the script/caps split mirrors how the flyer sets it. */
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
  /* "Coming soon" is a timing statement, so it belongs in the schedule column
     beside Bombay Jam's start date rather than as an eyebrow. There is nothing
     qualitative to say about this class yet — its one line is the whole
     record — so it carries no eyebrow at all. */
  { name: "Kids' Dance",
    desc: "After-school classes for younger movers.",
    schedule: { status: "Coming soon" } },
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
   SmashShuttler: Caveat 700 cursive    "smash!" orange · "shuttler" white
   SquashTigers:  Exo 2 800 italic      "squash" white · "tigers" orange
   Chester County Cricket Academy ships a crest rather than a wordmark, and
   has no brand webfont, so it is a cropped shield image plus the name set in
   the site's own condensed face. Cropping to the shield keeps all three marks
   at the same optical weight — the full badge is roughly twice as tall. */
/* The line the detail column shows before you point at anything. Every claim is
   read off the entries below rather than invented: cricket has a date, squash
   takes trials today, badminton has a brand and no date yet. */
const ROSTER_INTRO =
  "Coaching runs through three academies rather than the club itself — cricket opens Sep 28th, squash takes trials now, badminton follows. The studio floor is the club's own: dance and fitness, all levels.";

const ACADEMY_PARTNERS = [
  {
    name: "Chester County Cricket Academy",
    href: "https://cccricketacademy.com",
    short: "Cricket",
    sport: "Cricket academy",
    /* No platform programme exists for cricket yet — squad_programs has one
       active row at Exton and it is the dance class — so this row's timetable
       is local copy. It uses the same shape the platform feed produces, so the
       day cricket IS entered in /admin/squads the live data takes over with no
       markup change. The date is Exton's own announcement: CCCA publishes
       nothing about this building. */
    schedule: { startsOn: "Sep 28", when: "7 days a week" },
    /* Near-verbatim from cccricketacademy.com. Deliberately NOT saying more:
       their site gives no founding year, and its published indoor season runs
       Oct-Mar at All-Star Sports Academy in Downingtown with outdoor sessions
       at Exton Park in MALVERN — which is not this building. "Coming Sep 28th"
       is Exton's own announcement, so it stays framed as ours. */
    blurb:
      "High-quality cricket coaching for aspiring cricketers of all ages and skill levels, with junior enrolments open for girls and boys.",
    /* No trial: the platform has no trial concept at all, and CCCA runs its own
       enrolment. The address is the honest ask. */
    action: { label: "Register interest", href: "mailto:cricket@extonsports.com?subject=Cricket%20academy%20enquiry" },
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
    /* No timetable: squashtigers.com's session pattern is a GROUP-WIDE
       statement across NJ/PA/CT and qualified with "when school is in session",
       so publishing it as an Exton schedule would be wrong. The status is what
       is true and useful. */
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
    name: "SmashShuttler",
    href: "https://smashshuttler.com",
    short: "Badminton",
    sport: "Badminton academy",
    /* Same move as the other rows: "Coming soon" is timing, so it sits in the
       schedule column. smashshuttler.com still says "Coming Summer 2026", so no
       firmer date may be published here than they publish themselves. */
    schedule: { status: "Coming soon" },
    /* Everything here is from smashshuttler.com. It is NOT yet running, so
       there is no trial to offer and nothing may be claimed about which courts
       it will use — no source links SmashShuttler to this building's three. */
    blurb:
      "A high-performance junior badminton academy — footwork, speed and shot-making.",
    action: { label: "Get notified", href: "https://smashshuttler.com" },
    logo: (
      <span
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 700,
          fontSize: "clamp(2.3rem, 3vw, 4rem)",
          lineHeight: 1.1,
        }}
      >
        <span style={{ color: "var(--ember-ink)" }}>smash!</span>
        <span style={{ color: "var(--on-tile)" }}>shuttler</span>
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
