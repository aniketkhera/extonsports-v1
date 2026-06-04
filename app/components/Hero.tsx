"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
              minHeight: "calc(100svh - 64px - 240px)",
              height: "calc(100svh - 64px - 240px)",
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

      {/* RIGHT: Academies */}
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

  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      animate={isMobile ? {} : { flex }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden cursor-pointer ${
        kind === "recreation"
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
        style={{
          background:
            "radial-gradient(70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.85) 100%)",
        }}
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
          color: "rgba(255,255,255,1)",
          fontSize: isMobile ? "clamp(10rem, 45vw, 16rem)" : "clamp(22rem, 38vw, 52rem)",
          lineHeight: 0.78,
          letterSpacing: "-0.04em",
          top: kind === "academies" ? "-12%" : undefined,
          bottom: kind === "recreation" ? "-18%" : undefined,
          left: kind === "academies" ? "-10%" : undefined,
          right: kind === "recreation" ? "-12%" : undefined,
        }}
      >
        {config.bigLetter}
      </motion.span>

      {/* Hint chip — hidden on mobile, visible on desktop, fades on hover */}
      <motion.div
        animate={{ opacity: hovered ? 0 : 1, y: hovered ? -6 : 0 }}
        transition={{ duration: 0.3 }}
        className={`absolute top-[48px] z-10 hidden md:flex items-center gap-2.5 text-cond-md text-[0.78rem] text-white/55 ${
          kind === "academies" ? "left-[48px]" : "right-[48px] flex-row-reverse"
        }`}
      >
        <span>Hover to explore</span>
        {kind === "academies" ? (
          <svg width="28" height="10" viewBox="0 0 28 10" fill="none" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4"/>
            <polyline points="18,1 25,5 18,9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="28" height="10" viewBox="0 0 28 10" fill="none" aria-hidden>
            <line x1="28" y1="5" x2="6" y2="5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4"/>
            <polyline points="10,1 3,5 10,9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        )}
      </motion.div>

      {/* Body content */}
      <div className={`relative z-[3] flex flex-col p-8 md:p-12 ${isMobile ? "pt-10 pb-20" : "h-full justify-end"}`}>
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
            <p className="text-white/70 text-[0.94rem] leading-[1.55] max-w-[38ch] mb-4">
              {config.body}
            </p>
          )}
        </motion.div>

        {/* Membership tiers — always visible on Recreation panel */}
        {kind === "recreation" && (
          <motion.div
            className={`${isMobile ? "grid grid-cols-2" : "flex"} gap-2 mt-3`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
            }}
          >
            {MEMBERSHIP_TIERS.map((tier) => (
              <motion.div
                key={tier.name}
                className="h-full"
                variants={{
                  hidden: { opacity: 0, y: 18, scale: 0.96 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
              <motion.a
                href="#waitlist"
                animate={
                  isMobile
                    ? {
                        paddingTop: 10,
                        paddingBottom: 10,
                        backgroundColor: "rgba(255,255,255,0.07)",
                      }
                    : {
                        paddingTop: hovered ? 10 : 5,
                        paddingBottom: hovered ? 10 : 5,
                        backgroundColor: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                      }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="border border-white/10 hover:border-[var(--color-ember)]/50 block overflow-hidden px-4 transition-colors w-full min-w-0"
                style={{ height: "72px" }}
              >
                <motion.div
                  animate={isMobile ? { scale: 1, originX: 0 } : { scale: hovered ? 1 : 0.8, originX: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="text-cond leading-none tracking-wide"
                  style={{
                    fontSize: "clamp(0.9rem, 1.4vw, 1.1rem)",
                    transformOrigin: "left center",
                    color: "var(--color-ember)",
                  }}
                >
                  {tier.name}
                </motion.div>
                <motion.div
                  animate={
                    isMobile
                      ? { opacity: 0.55, height: "auto", marginTop: 5 }
                      : {
                          opacity: hovered ? 0.55 : 0,
                          height: hovered ? "auto" : 0,
                          marginTop: hovered ? 5 : 0,
                        }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-white/55 overflow-hidden"
                  style={{ fontSize: "0.72rem", lineHeight: 1.45 }}
                >
                  {tier.desc}
                </motion.div>
              </motion.a>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Academy logos — always visible; compact when not hovered, full when hovered */}
        {kind === "academies" && (
          <motion.div
            className={`w-full ${isMobile ? "flex flex-col" : "flex"} gap-2 mt-3`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "0px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
            }}
          >
            {[...ACADEMY_PARTNERS].reverse().map((ac) => (
              <motion.div
                key={ac.name}
                className={`h-full min-w-0 ${isMobile ? "w-full" : "flex-1"}`}
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
                        backgroundColor: "rgba(255,255,255,0.07)",
                      }
                    : {
                        paddingTop: hovered ? 12 : 5,
                        paddingBottom: hovered ? 12 : 5,
                        backgroundColor: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                      }
                }
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={`border border-white/10 hover:border-[var(--color-ember)]/50 block overflow-hidden px-4 transition-colors ${isMobile ? "w-full" : "flex-1"}`}
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
              </motion.a>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Content config ───────────────────────────────────────────── */

const ACADEMIES = {
  bigLetter: "A",
  bg: "radial-gradient(60% 80% at 20% 40%, rgba(248,155,114,0.20) 0%, transparent 60%), linear-gradient(135deg, #121212 0%, #1A1A1A 100%)",
  label: "Academies · Juniors",
  headline: { line1: "Train.", line2: "Compete." },
  body: "Structured Coaching in Cricket, Squash and Badminton. Fitness and Agility on the Turf.",
  cta: "Explore academies",
};

const RECREATION = {
  bigLetter: "R",
  bg: "radial-gradient(60% 80% at 80% 60%, rgba(248,155,114,0.12) 0%, transparent 65%), linear-gradient(225deg, #0B0B0B 0%, #181818 100%)",
  label: "Recreation · Members",
  headline: { line1: "Play.", line2: "Anytime." },
  body: "Members-only access to all four sports — book a court at 6 a.m. or midnight, walk in any day. Your hours, your game.",
  cta: "Become a member",
};

/* Membership tiers shown on the Recreation panel. */
const MEMBERSHIP_TIERS = [
  {
    name: "GUEST",
    desc: "Pay-to-play court access. No membership required.",
  },
  {
    name: "ADULT",
    desc: "24×7 access. Book courts, play with members, bring guests for a fee.",
  },
  {
    name: "ADD-ON",
    desc: "For members of the same household. Full access at a reduced rate.",
  },
  {
    name: "JUNIOR",
    desc: "Under 18. Full court access, academy programs, supervised open play.",
  },
];

/* Academy partner logos — accurate fonts per brand.
   ExcelCricket:  Comfortaa 700         "Excel" orange · "Cricket" white
   SmashShuttler: Caveat 700 cursive    "smash!" orange · "shuttler" white
   SquashTigers:  Exo 2 800 italic      "squash" white · "tigers" orange  */
const ACADEMY_PARTNERS = [
  {
    name: "ExcelCricket",
    href: "https://www.excelcricket.com",
    sport: "Cricket academy",
    logo: (
      <span
        style={{
          fontFamily: "var(--font-comfortaa), cursive",
          fontWeight: 700,
          fontSize: "1.15rem",
        }}
      >
        <span style={{ color: "var(--color-ember)" }}>excel</span>
        <span style={{ color: "#FFFFFF" }}>cricket</span>
      </span>
    ),
  },
  {
    name: "SmashShuttler",
    href: "https://smashshuttler.com",
    sport: "Badminton academy",
    logo: (
      <span
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 700,
          fontSize: "1.35rem",
          lineHeight: 1.1,
        }}
      >
        <span style={{ color: "var(--color-ember)" }}>smash!</span>
        <span style={{ color: "#FFFFFF" }}>shuttler</span>
      </span>
    ),
  },
  {
    name: "SquashTigers",
    href: "https://squashtigers.com",
    sport: "Squash academy",
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
        <span style={{ color: "#FFFFFF" }}>SQUASH</span>
        <span style={{ color: "var(--color-ember)" }}>TIGERS</span>
      </span>
    ),
  },
];
