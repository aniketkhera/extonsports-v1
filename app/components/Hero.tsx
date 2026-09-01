"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import type { AvailabilityPayload } from "../api/availability/route";
import { COURT_RATES, RATE_BANDS, RATE_FOOTNOTE, RATE_FEES_NOTE } from "../../lib/rates";
import { BOOK_COURTS_URL, bookingTarget } from "../../lib/booking";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_E164 } from "../../lib/legal";

type PanelKey = "academies" | "recreation" | "studio";

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
    return hovered === key ? 1.6 : 0.7;
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

      {/* MIDDLE: Academies */}
      <Panel
        kind="academies"
        flex={flexFor("academies")}
        onEnter={() => !isMobile && setHovered("academies")}
        onLeave={() => !isMobile && setHovered(null)}
        hovered={isMobile ? true : hovered === "academies"}
        anyHovered={isMobile ? true : hovered !== null}
        isMobile={isMobile}
      />

      {/* RIGHT: Studio — dance and floor classes. The third thing the building
          does, and the only one that is neither a court booking nor a junior
          academy, so it earns its own panel rather than a row inside one. */}
      <Panel
        kind="studio"
        flex={flexFor("studio")}
        onEnter={() => !isMobile && setHovered("studio")}
        onLeave={() => !isMobile && setHovered(null)}
        hovered={isMobile ? true : hovered === "studio"}
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
  const config = kind === "academies" ? ACADEMIES : kind === "studio" ? STUDIO : RECREATION;

  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      animate={isMobile ? {} : { flex }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`relative cursor-pointer ${
        isMobile ? "overflow-visible" : "overflow-hidden"
      } ${
        /* The rule is "every panel except the last", not "the recreation
           panel". It was keyed on recreation while there were only two, so
           adding a third left the academies/studio seam with no line. */
        kind !== "studio"
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

      {/* Big background letter */}
      <motion.span
        aria-hidden
        animate={{
          opacity: hovered ? 0.085 : 0.04,
          scale: hovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute pointer-events-none select-none text-cond"
        style={{
          color: "var(--hero-glyph)",
          fontSize: isMobile ? "clamp(10rem, 45vw, 16rem)" : "clamp(22rem, 38vw, 52rem)",
          lineHeight: 0.78,
          letterSpacing: "-0.04em",
          top: kind === "academies" || kind === "studio" ? "-12%" : undefined,
          bottom: kind === "recreation" ? "-18%" : undefined,
          left: kind === "academies" ? "-10%" : kind === "studio" ? "-6%" : undefined,
          right: kind === "recreation" ? "-12%" : undefined,
        }}
      >
        {config.bigLetter}
      </motion.span>


      {/* Body content */}
      <div className={`relative z-[3] flex flex-col ${isMobile ? "p-8 pt-10 pb-10" : "h-full px-12 pt-16 pb-12 justify-start"}`}>
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

        {/* Studio classes — the same stacked-tile shape the academies use, so
            the two right-hand panels read as siblings rather than two
            different designs sharing a hero. */}
        {kind === "studio" && (
          <motion.div
            className="w-full flex flex-col gap-2 mt-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
            }}
          >
            {STUDIO_CLASSES.map((c) => (
              <motion.div
                key={c.name}
                className="h-full w-full min-w-0"
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.94 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <motion.div
                  animate={
                    isMobile
                      ? { paddingTop: 12, paddingBottom: 12, backgroundColor: "var(--tile-bg)" }
                      : {
                          paddingTop: hovered ? 12 : 5,
                          paddingBottom: hovered ? 12 : 5,
                          backgroundColor: hovered ? "var(--tile-bg)" : "var(--tile-bg-quiet)",
                        }
                  }
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="border border-white/10 flex flex-col px-4 py-3 h-full w-full"
                >
                  <span
                    className="text-cond leading-[1.05]"
                    style={{ fontSize: "0.95rem", letterSpacing: "0.02em", color: "var(--on-tile)" }}
                  >
                    {c.name}
                  </span>
                  <span
                    className="text-mono mt-[3px]"
                    style={{ fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-ember)" }}
                  >
                    {c.when}
                  </span>
                  <motion.div
                    animate={
                      isMobile
                        ? { opacity: 0.4, height: "auto", marginTop: 6 }
                        : {
                            opacity: hovered ? 0.4 : 0,
                            height: hovered ? "auto" : 0,
                            marginTop: hovered ? 6 : 0,
                          }
                    }
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <span className="text-[0.76rem] leading-[1.45]" style={{ color: "var(--on-tile)" }}>
                      {c.desc}
                    </span>
                  </motion.div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Academy logos — always visible; compact when not hovered, full when hovered */}
        {kind === "academies" && (
          <motion.div
            /* Stacked, not a 3-up grid. With a third panel beside it there is
               no longer width for three tiles side by side, and stacking also
               lets each logo sit at a readable size instead of being squeezed. */
            className="w-full flex flex-col gap-2 mt-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
            }}
          >
            {/* No .reverse(): the array is authored Cricket, Badminton,
                Squash and that is the order asked for. Reversing it was what
                put Squash first on the page. */}
            {ACADEMY_PARTNERS.map((ac) => (
              <motion.div
                key={ac.name}
                className="h-full w-full min-w-0"
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.94 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
              <motion.a
                href={ac.href}
                target="_blank"
                rel="noreferrer"
                animate={
                  isMobile
                    ? {
                        paddingTop: 12,
                        paddingBottom: 12,
                        backgroundColor: "var(--tile-bg)",
                      }
                    : {
                        paddingTop: hovered ? 12 : 5,
                        paddingBottom: hovered ? 12 : 5,
                        backgroundColor: hovered ? "var(--tile-bg)" : "var(--tile-bg-quiet)",
                      }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={`border border-white/10 hover:border-[var(--color-ember)]/50 flex flex-col px-4 py-3 transition-colors h-full ${isMobile ? "w-full" : "w-full"}`}
              >
                <motion.div
                  animate={isMobile ? { scale: 1, originX: 0 } : { scale: hovered ? 1 : 0.72, originX: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="leading-none"
                  style={{ transformOrigin: "left center" }}
                >
                  {ac.logo}
                </motion.div>
                <motion.div
                  animate={
                    isMobile
                      ? { opacity: 0.4, height: "auto", marginTop: 6 }
                      : {
                          opacity: hovered ? 0.4 : 0,
                          height: hovered ? "auto" : 0,
                          marginTop: hovered ? 6 : 0,
                        }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-mono text-[0.58rem] text-white overflow-hidden"
                >
                  {ac.sport}
                </motion.div>
                {"desc" in ac && ac.desc && (
                  <p className="text-white/55 mt-2 flex-1" style={{ fontSize: "0.72rem", lineHeight: 1.5 }}>
                    {(ac as { desc: string }).desc}
                  </p>
                )}
                {"cta" in ac && ac.cta && (
                  <span className="inline-block mt-auto pt-3 text-[var(--color-ember)] hover:text-white text-mono text-[0.6rem] border border-[var(--color-ember)]/50 px-3 py-1 transition-colors">
                    {(ac as { cta: string }).cta} →
                  </span>
                )}
              </motion.a>
              {"email" in ac && (ac as { email?: string }).email && (
                <a
                  href={`mailto:${(ac as { email: string }).email}`}
                  className="block border border-t-0 border-white/10 hover:border-[var(--color-ember)]/50 px-4 py-[7px] text-mono text-[0.6rem] text-[var(--color-ember)] hover:text-white transition-colors"
                >
                  Email us →
                </a>
              )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
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
        className="w-full border border-white/10 bg-white/[0.05]"
        variants={{
          hidden: { opacity: 0, y: 18 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
        }}
      >
        <div
          className={`${RATE_GRID} bg-white/[0.04] border-b border-white/[0.07]`}
          style={{ gridTemplateColumns: rateGrid(open), transition: RATE_GRID_EASE }}
        >
          <span className="text-mono text-[0.56rem] text-white/45">Per hour</span>
          {RATE_BANDS.map((b) => (
            <span key={b.key} className="text-mono text-[0.56rem] text-white/45">
              {b.label}
            </span>
          ))}
          {/* overflow-hidden lets the track close over the label instead of
              the text spilling across the panel edge mid-transition. */}
          {/* Gated, not just faded: opacity 0 still leaves the label in the
              accessibility tree and in the served HTML. */}
          {SHOW_NEXT_SLOT && (
          <span
            className="text-mono text-[0.56rem] text-white/45 flex items-center gap-[6px] overflow-hidden whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: open ? 1 : 0 }}
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
              style={{ fontSize: "0.95rem", color: "var(--ember-ink)" }}
            >
              {r.sport}
            </span>
            {RATE_BANDS.map((b) => (
              <span
                key={b.key}
                className={`text-[0.84rem] font-medium ${
                  // Peak is the price most people will actually pay, so it is
                  // the one that reads at full strength.
                  b.key === "peak" ? "text-white" : "text-white/[0.72]"
                }`}
              >
                ${r[b.key]}
              </span>
            ))}
            <span
              className="text-cond tracking-[0.02em] whitespace-nowrap overflow-hidden transition-opacity duration-300"
              style={{
                fontSize: "0.86rem",
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
        className="text-white/40 text-[0.7rem]"
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
        <span className="text-mono text-[0.56rem] text-[var(--color-ember)]">
          Bulk &amp; block bookings
        </span>
        <span className="text-white/60 text-[0.78rem]">
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

/* ─── Content config ───────────────────────────────────────────── */

const ACADEMIES = {
  bigLetter: "A",
  bg: "var(--hero-aca-bg)",
  label: "Academies · Juniors",
  headline: { line1: "Train.", line2: "Compete." },
  body: "Structured Coaching in Cricket, Squash and Badminton. Fitness and Agility on the Turf.",
  cta: "Explore academies",
};

/* The third panel. Named for what the room is rather than one class that runs
   in it — Bollywood is the headline offering, not the whole offering, and a
   panel called "Bollywood" would have to be renamed the moment a second class
   lands. "Dance. / Move." keeps the verb pattern the other two panels set. */
/* Bollywood is real and dated; the rest is honestly labelled as not yet
   running. Saying "coming soon" beats inventing a timetable, and it matches
   how the academies panel already handles its two unlaunched partners. */
const STUDIO_CLASSES = [
  { name: "Bollywood Dance", when: "New this season",
    desc: "Filmi routines and bhangra footwork, with a proper warm-up. All levels, no partner needed." },
  { name: "Studio Fitness", when: "Coming soon",
    desc: "Strength, mobility and conditioning on the studio floor." },
  { name: "Kids' Dance", when: "Coming soon",
    desc: "After-school classes for younger movers." },
];

const STUDIO = {
  bigLetter: "S",
  bg: "var(--hero-aca-bg)",
  label: "Studio · All ages",
  headline: { line1: "Dance.", line2: "Move." },
  body: "Bollywood and bhangra choreography, plus fitness on the studio floor. All levels, no partner needed.",
  cta: "Join the waitlist",
};

const RECREATION = {
  bigLetter: "R",
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
const ACADEMY_PARTNERS = [
  {
    name: "Chester County Cricket Academy",
    href: "https://cccricketacademy.com",
    sport: "Cricket academy",
    desc: "Coming Sep 28th",
    cta: "Learn More",
    email: "cricket@extonsports.com",
    logo: (
      <span className="flex items-center gap-[9px]">
        <Image
          src="/academies/ccca-shield.png"
          alt=""
          width={360}
          height={239}
          className="h-[26px] w-auto shrink-0"
          priority
        />
        {/* "Academy" is left off deliberately — the tile's own sport label
            directly below already says "Cricket academy". */}
        <span
          className="text-cond leading-[1.05]"
          style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}
        >
          <span className="block text-[var(--color-ember)]">Chester County</span>
          <span className="block text-white">Cricket</span>
        </span>
      </span>
    ),
  },
  {
    name: "SmashShuttler",
    href: "https://smashshuttler.com",
    sport: "Badminton academy",
    desc: "Coming Soon",
    cta: "Learn More",
    logo: (
      <span
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 700,
          fontSize: "1.35rem",
          lineHeight: 1.1,
        }}
      >
        <span style={{ color: "var(--ember-ink)" }}>smash!</span>
        <span style={{ color: "var(--on-tile)" }}>shuttler</span>
      </span>
    ),
  },
  {
    name: "SquashTigers",
    href: "https://squashtigers.com",
    sport: "Squash academy",
    desc: "High performance junior squash academy with locations in NJ, PA and CT (forthcoming).",
    cta: "Book a Trial",
    logo: (
      <span
        style={{
          fontFamily: "var(--font-exo2), sans-serif",
          fontWeight: 800,
          fontStyle: "italic",
          fontSize: "1.1rem",
          letterSpacing: "0.06em",
        }}
      >
        <span style={{ color: "var(--on-tile)" }}>SQUASH</span>
        <span style={{ color: "var(--ember-ink)" }}>TIGERS</span>
      </span>
    ),
  },
];
