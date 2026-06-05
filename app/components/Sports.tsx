"use client";

import { motion } from "framer-motion";

type Sport = {
  n: string;
  name: string;
  count: string;
  unit: string;
  spec: string;
  body: string;
  // SVG line decoration drawn faintly on the card
  decoration: "cricket" | "squash" | "badminton" | "turf" | "fitness";
  prefix?: string; // orange headline shown when count is "—"
};

const sports: Sport[] = [
  {
    n: "01",
    name: "Cricket",
    count: "3",
    unit: "lanes",
    spec: "Indoor practice lanes · full bowler run-up",
    body: "Three full-length indoor lanes with leather ball, ball machines and full run-up — open to members at any hour.",
    decoration: "cricket",
  },
  {
    n: "02",
    name: "Squash",
    count: "4",
    unit: "courts",
    spec: "Full-glass · WSF spec",
    body: "Four tournament-grade all-glass courts. The same spec used at championships. Solo practice or league play.",
    decoration: "squash",
  },
  {
    n: "03",
    name: "Badminton",
    count: "3",
    unit: "courts",
    spec: "Wooden sprung floor",
    body: "Three full-spec courts with proper height clearance, sprung wooden floors, and tournament shuttle conditions.",
    decoration: "badminton",
  },
  {
    n: "04",
    name: "Turf",
    count: "—",
    unit: "",
    prefix: "Indoor",
    spec: "Athletic lanes · year-round",
    body: "Indoor turf with marked athletic running lanes — sprint work, agility drills, conditioning, and a back-of-house spot for extra cricket nets when needed.",
    decoration: "turf",
  },
  {
    n: "05",
    name: "Fitness",
    count: "—",
    unit: "",
    prefix: "Studio",
    spec: "Rowers · weights · cable",
    body: "Dedicated fitness studio with rowing machines, free weights, and cable training — included with every membership.",
    decoration: "fitness",
  },
];

export default function Sports() {
  return (
    <section id="sports" className="relative px-4 sm:px-6 md:px-12 py-16 md:py-24">
      <div className="mx-auto max-w-[1280px]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-10 items-end"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-7 h-px bg-[var(--color-ember)]" />
              <span className="text-mono text-[0.7rem] text-[var(--color-ember)]">
                Five sports · one club
              </span>
            </div>
            <h2
              className="text-cond text-white"
              style={{ fontSize: "clamp(2.4rem, 4.8vw, 4.2rem)" }}
            >
              All under one
              <br />
              <span className="text-[var(--color-ember)]">roof</span>
              <span className="text-[var(--color-ember)]">.</span>
            </h2>
          </div>
          <p className="text-white/60 text-[0.94rem] leading-[1.7] max-w-[44ch]">
            One booking per day, per member — squash today, badminton
            tomorrow, cricket the day after. No upcharges, no per-sport
            fees, no separate memberships.
          </p>
        </motion.div>

        {/* Sport cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {sports.map((s, i) => (
            <motion.article
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.55, delay: i * 0.07 }}
              className="group relative overflow-hidden bg-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-ember)] transition-colors p-7 min-h-[320px] flex flex-col"
            >
              {/* faint court-line decoration */}
              <SportDeco kind={s.decoration} />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-7">
                  <span className="text-mono text-[0.7rem] text-white/35">
                    {s.n}
                  </span>
                  <span className="text-mono text-[0.62rem] text-white/40">
                    {s.spec}
                  </span>
                </div>

                {/* Big count */}
                {s.count !== "—" ? (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="text-cond text-[var(--color-ember)] leading-none"
                      style={{ fontSize: "clamp(4.2rem, 6vw, 5.6rem)" }}
                    >
                      {s.count}
                    </span>
                    <span className="text-cond-md text-[0.78rem] text-[var(--color-ember-hi)]">
                      {s.unit}
                    </span>
                  </div>
                ) : (
                  <div
                    className="text-cond text-[var(--color-ember)] leading-none mb-3"
                    style={{ fontSize: "clamp(2.8rem, 3.6vw, 3.4rem)" }}
                  >
                    {s.prefix ?? ""}
                  </div>
                )}

                <h3
                  className="text-cond text-white mb-4"
                  style={{ fontSize: "clamp(1.9rem, 2.6vw, 2.4rem)" }}
                >
                  {s.name}
                </h3>

                <p className="text-white/60 text-[0.86rem] leading-[1.6] mt-auto">
                  {s.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ─── Sport-specific court lines — accurate to the real sport ── */
function SportDeco({ kind }: { kind: Sport["decoration"] }) {
  // Higher opacity than before so the lines actually read.
  const line = "rgba(248,155,114,0.18)";
  const lineSoft = "rgba(248,155,114,0.11)";
  const fillSoft = "rgba(248,155,114,0.05)";
  const tin = "rgba(248,155,114,0.30)";
  const sw = 1.2;

  return (
    <svg
      aria-hidden
      viewBox="0 0 200 280"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      {kind === "cricket" && (
        <>
          {/* 22-yard pitch — vertical strip with creases + wickets ─────── */}
          {/* pitch tramlines */}
          <rect x="74" y="22" width="52" height="236" stroke={line} strokeWidth={sw} fill={fillSoft} />
          {/* TOP popping crease + return creases */}
          <line x1="60" y1="50" x2="140" y2="50" stroke={line} strokeWidth={sw + 0.4} />
          <line x1="74" y1="50" x2="74" y2="32" stroke={line} strokeWidth={sw} />
          <line x1="126" y1="50" x2="126" y2="32" stroke={line} strokeWidth={sw} />
          {/* TOP wickets — 3 stumps + bails */}
          <g stroke={line} strokeWidth={sw + 0.2}>
            <line x1="94" y1="32" x2="94" y2="22" />
            <line x1="100" y1="32" x2="100" y2="22" />
            <line x1="106" y1="32" x2="106" y2="22" />
            <line x1="92" y1="22" x2="108" y2="22" />
          </g>
          {/* BOTTOM popping crease + return creases */}
          <line x1="60" y1="230" x2="140" y2="230" stroke={line} strokeWidth={sw + 0.4} />
          <line x1="74" y1="230" x2="74" y2="248" stroke={line} strokeWidth={sw} />
          <line x1="126" y1="230" x2="126" y2="248" stroke={line} strokeWidth={sw} />
          {/* BOTTOM wickets */}
          <g stroke={line} strokeWidth={sw + 0.2}>
            <line x1="94" y1="248" x2="94" y2="258" />
            <line x1="100" y1="248" x2="100" y2="258" />
            <line x1="106" y1="248" x2="106" y2="258" />
            <line x1="92" y1="258" x2="108" y2="258" />
          </g>
        </>
      )}

      {kind === "squash" && (
        <>
          {/* Top-down squash court ──────────────────────────────────────
              Top edge of viewBox = front wall (where players hit the tin)
              Bottom edge = back wall (glass).                            */}
          <rect x="22" y="22" width="156" height="236" stroke={line} strokeWidth={sw} fill="none" />

          {/* Red TIN strip across the front (top edge) — solid bar */}
          <rect x="22" y="22" width="156" height="6" stroke="none" fill={tin} />

          {/* Short line (across) — at 5.49 m of the 9.75 m length */}
          <line x1="22" y1="160" x2="178" y2="160" stroke={line} strokeWidth={sw} />

          {/* Half-court line — from short line to back wall (middle) */}
          <line x1="100" y1="160" x2="100" y2="258" stroke={line} strokeWidth={sw} />

          {/* Two service boxes (1.6 m × 1.6 m) along the short line */}
          <rect x="22" y="160" width="30" height="30" stroke={line} strokeWidth={sw} fill="none" />
          <rect x="148" y="160" width="30" height="30" stroke={line} strokeWidth={sw} fill="none" />

          {/* The "T" — small marker at the intersection */}
          <circle cx="100" cy="160" r="1.6" fill={line} />
        </>
      )}

      {kind === "badminton" && (
        <>
          {/* Top-down doubles badminton court — net horizontal in middle */}
          {/* Outer doubles court */}
          <rect x="22" y="36" width="156" height="208" stroke={line} strokeWidth={sw} fill="none" />
          {/* Inner singles sidelines */}
          <line x1="35" y1="36" x2="35" y2="244" stroke={lineSoft} strokeWidth={sw} />
          <line x1="165" y1="36" x2="165" y2="244" stroke={lineSoft} strokeWidth={sw} />
          {/* Net — thicker, dashed-ish look */}
          <line x1="14" y1="140" x2="186" y2="140" stroke={tin} strokeWidth={sw + 1.3} />
          {/* Short service lines (1.98 m from net, both sides) */}
          <line x1="22" y1="100" x2="178" y2="100" stroke={line} strokeWidth={sw} />
          <line x1="22" y1="180" x2="178" y2="180" stroke={line} strokeWidth={sw} />
          {/* Long service line for doubles (just short of baseline) */}
          <line x1="22" y1="52" x2="178" y2="52" stroke={lineSoft} strokeWidth={sw} />
          <line x1="22" y1="228" x2="178" y2="228" stroke={lineSoft} strokeWidth={sw} />
          {/* Centre service line (top + bottom halves only, not through net) */}
          <line x1="100" y1="52" x2="100" y2="100" stroke={line} strokeWidth={sw} />
          <line x1="100" y1="180" x2="100" y2="228" stroke={line} strokeWidth={sw} />
        </>
      )}

      {kind === "fitness" && (
        <>
          {/* Rowing machine — top-down view, centred and large */}
          {/* Frame */}
          <rect x="74" y="30" width="52" height="160" stroke={line} strokeWidth={sw} fill="none" rx="5" />
          {/* Flywheel housing at top */}
          <circle cx="100" cy="52" r="16" stroke={line} strokeWidth={sw} fill="none" />
          <circle cx="100" cy="52" r="6" stroke={lineSoft} strokeWidth={sw} fill="none" />
          {/* Monorail */}
          <line x1="100" y1="68" x2="100" y2="170" stroke={lineSoft} strokeWidth={sw} />
          {/* Seat */}
          <rect x="88" y="100" width="24" height="16" stroke={line} strokeWidth={sw} fill={fillSoft} rx="2" />
          {/* Foot stretcher */}
          <rect x="82" y="158" width="36" height="18" stroke={line} strokeWidth={sw} fill="none" rx="2" />
          {/* Foot pads */}
          <rect x="83" y="159" width="14" height="16" stroke={lineSoft} strokeWidth={sw - 0.4} fill="none" />
          <rect x="103" y="159" width="14" height="16" stroke={lineSoft} strokeWidth={sw - 0.4} fill="none" />
          {/* Handle chain — dashed */}
          <line x1="100" y1="68" x2="100" y2="100" stroke={lineSoft} strokeWidth={sw} strokeDasharray="3 3" />

          {/* Dumbbell — bottom of card */}
          {/* Bar */}
          <line x1="60" y1="230" x2="140" y2="230" stroke={line} strokeWidth={sw + 0.6} />
          {/* Left collar */}
          <rect x="60" y="224" width="8" height="12" stroke={line} strokeWidth={sw} fill={fillSoft} rx="1" />
          {/* Left plate */}
          <circle cx="52" cy="230" r="10" stroke={line} strokeWidth={sw} fill="none" />
          <circle cx="52" cy="230" r="5" stroke={lineSoft} strokeWidth={sw - 0.4} fill="none" />
          {/* Right collar */}
          <rect x="132" y="224" width="8" height="12" stroke={line} strokeWidth={sw} fill={fillSoft} rx="1" />
          {/* Right plate */}
          <circle cx="148" cy="230" r="10" stroke={line} strokeWidth={sw} fill="none" />
          <circle cx="148" cy="230" r="5" stroke={lineSoft} strokeWidth={sw - 0.4} fill="none" />
        </>
      )}

      {kind === "turf" && (
        <>
          {/* Indoor turf — running lanes (athletic) */}
          {/* Outer turf */}
          <rect x="22" y="36" width="156" height="208" stroke={line} strokeWidth={sw} fill="none" />
          {/* 2 vertical lane dividers — 3 lanes */}
          <line x1="74" y1="36" x2="74" y2="244" stroke={lineSoft} strokeWidth={sw} />
          <line x1="126" y1="36" x2="126" y2="244" stroke={lineSoft} strokeWidth={sw} />
          {/* Start line (top) — solid bar */}
          <rect x="22" y="36" width="156" height="3" stroke="none" fill={tin} />
          {/* Finish line (bottom) — solid bar */}
          <rect x="22" y="241" width="156" height="3" stroke="none" fill={tin} />
          {/* Subtle stagger marks halfway down */}
          <line x1="22" y1="140" x2="178" y2="140" stroke={lineSoft} strokeWidth={sw - 0.4} strokeDasharray="3 5" />
        </>
      )}
    </svg>
  );
}
