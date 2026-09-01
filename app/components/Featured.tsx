"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { FeaturedPayload } from "../api/featured/route";
import { BOOK_CLASSES_URL, bookingTarget } from "../../lib/booking";

/* Featured — the "what's on this season" rail, directly under the hero.

   The hero sells court time. This sells the things that are not court time:
   classes and sessions that run on the turf and in the studio, booked the same
   way. It sits above the sports breakdown because a first-time visitor is far
   more likely to come for a class than to know they want lane 3.

   Only the name and the description live here. The class time, the price and
   the spots left come from the platform via /api/featured — a schedule written
   into marketing copy goes stale the moment someone reschedules, and the
   visitor finds out at checkout. When the platform has nothing to say the card
   drops the schedule line rather than inventing one. */

type Feature = {
  /** Matches the session slug on the platform, so /api/featured can join. */
  slug: string;
  title: string;
  kicker: string;
  body: string;
  /** Sits behind the card as a faint oversized glyph, like the hero letters. */
  glyph: string;
};

const FEATURES: Feature[] = [
  {
    slug: "bollywood-dance",
    title: "Bollywood Dance",
    kicker: "New this season",
    body: "High-energy Bollywood choreography on the studio floor — filmi routines, bhangra footwork and a proper warm-up. All levels, no partner needed, no experience assumed.",
    glyph: "♪",
  },
];

export default function Featured() {
  const book = bookingTarget(BOOK_CLASSES_URL);
  const [sessions, setSessions] = useState<FeaturedPayload["sessions"]>([]);

  useEffect(() => {
    let live = true;
    fetch("/api/featured")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: FeaturedPayload | null) => live && setSessions(d?.sessions ?? []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const sessionFor = (slug: string) => sessions.find((s) => s.slug === slug) ?? null;

  return (
    <section
      id="featured"
      className="relative px-4 sm:px-6 md:px-12 py-14 md:py-20 border-b border-[var(--color-line)]"
    >
      {/* Ambient wash, matched to the hero's radial dim so the two sections
          read as one surface rather than a stack of unrelated bands. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 130% at 20% 0%, rgba(248,155,114,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-6"
        >
          <span className="w-7 h-px bg-[var(--color-ember)]" />
          <span className="text-mono text-[0.7rem] text-[var(--color-ember)]">
            Featured
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden border border-[var(--color-line-2)] bg-[var(--color-ink)] hover:border-[var(--color-ember)]/45 transition-colors"
            >
              {/* Oversized glyph, same trick as the hero's R and A */}
              <span
                aria-hidden
                className="absolute pointer-events-none select-none text-cond leading-none transition-opacity duration-500 opacity-[0.05] group-hover:opacity-[0.09]"
                style={{
                  color: "var(--hero-glyph)",
                  fontSize: "clamp(12rem, 22vw, 20rem)",
                  right: "-4%",
                  bottom: "-28%",
                }}
              >
                {f.glyph}
              </span>

              <div className="relative z-[2] p-7 sm:p-9 flex flex-col gap-4 items-start">
                <span className="text-mono text-[0.58rem] px-[9px] py-[4px] bg-[var(--color-ember)] text-black">
                  {f.kicker}
                </span>

                <h3
                  className="text-cond text-white"
                  style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.9rem)" }}
                >
                  {f.title}
                </h3>

                {/* Schedule and price only appear once the platform supplies
                    them — an absent line is better than a wrong one. */}
                {(sessionFor(f.slug)?.when || sessionFor(f.slug)?.price) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {sessionFor(f.slug)?.when && (
                      <span className="text-mono text-[0.62rem] text-white/55">
                        {sessionFor(f.slug)!.when}
                      </span>
                    )}
                    {sessionFor(f.slug)?.price && (
                      <span
                        className="text-mono text-[0.62rem]"
                        style={{ color: "var(--color-green)" }}
                      >
                        {sessionFor(f.slug)!.price}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-white/60 text-[0.92rem] leading-[1.6] max-w-[52ch]">
                  {f.body}
                </p>

                <a
                  href={book.href}
                  {...(book.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="text-mono text-[0.66rem] px-[18px] py-[9px] mt-1 bg-[var(--color-ember)] text-black border border-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] hover:border-[var(--color-ember-hi)] transition-colors"
                >
                  {book.external ? "Book a place" : "Join the waitlist"}
                </a>
              </div>
            </motion.article>
          ))}

          {/* Empty slot — says more sessions are coming without inventing
              them, and keeps the two-column grid from looking broken while
              Bollywood Dance is the only thing on the board. */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12% 0px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="border border-dashed border-[var(--color-line-2)] p-7 sm:p-9 flex flex-col justify-center gap-3"
          >
            <h3
              className="text-cond text-white/35"
              style={{ fontSize: "clamp(1.4rem, 2.4vw, 2rem)" }}
            >
              More sessions coming
            </h3>
            <p className="text-white/35 text-[0.9rem] leading-[1.6] max-w-[46ch]">
              Junior camps, adult leagues and open-play nights land on this board
              as the calendar fills. Tell us what you want to see —{" "}
              <a
                href="#waitlist"
                className="text-white/60 border-b border-[var(--color-ember)]/40 hover:text-white hover:border-[var(--color-ember)] transition-colors"
              >
                join the waitlist
              </a>
              .
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
