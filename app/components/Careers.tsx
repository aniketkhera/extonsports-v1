"use client";

import { motion } from "framer-motion";

type Opening = {
  slug: string;
  title: string;
  academy: string;
  type: string;
  location: string;
  comp: string;
  tags: string[];
  blurb: string;
};

const openings: Opening[] = [
  {
    slug: "head-cricket-coach",
    title: "Head Cricket Coach",
    academy: "Excel Cricket Academy",
    type: "Full-time · Exempt",
    location: "Philadelphia, PA · On-site",
    comp: "$55,000–$70,000 / yr + incentives",
    tags: ["Founding role", "Visa sponsorship available", "High-performance"],
    blurb:
      "Found a brand-new youth cricket academy from zero — build the curriculum, recruit the first cohort, and get the program plugged into the USA Cricket ecosystem and competing from year one.",
  },
  {
    slug: "head-badminton-coach",
    title: "Head Badminton Coach",
    academy: "SmashShuttler Badminton Academy",
    type: "Full-time · Exempt",
    location: "Philadelphia, PA · On-site",
    comp: "$55,000–$70,000 / yr + incentives",
    tags: ["Founding role", "Visa sponsorship available", "High-performance"],
    blurb:
      "Found a brand-new youth badminton academy from zero — build the curriculum, recruit the first cohort, and get the program plugged into the USA Badminton ecosystem and competing from year one.",
  },
];

export default function Careers() {
  return (
    <section
      id="careers"
      className="relative px-4 sm:px-6 md:px-12 py-16 md:py-24 border-t border-[var(--color-line)]"
    >
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
                Careers · we&apos;re hiring
              </span>
            </div>
            <h2
              className="text-cond text-white"
              style={{ fontSize: "clamp(2.4rem, 4.8vw, 4.2rem)" }}
            >
              Build the program.
              <br />
              <span className="text-[var(--color-ember)]">Join the team.</span>
            </h2>
          </div>
          <p className="text-white/60 text-[0.94rem] leading-[1.7] max-w-[44ch]">
            We&apos;re growing the sports we run under one roof — and building the
            coaching teams behind them. Open roles are listed below; applications
            are reviewed on a rolling basis.
          </p>
        </motion.div>

        {/* Job listings */}
        <div className="flex flex-col gap-3">
          {openings.map((o, i) => (
            <motion.a
              key={o.slug}
              href={`/careers/${o.slug}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.55, delay: i * 0.07 }}
              className="group relative block bg-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-ember)] transition-colors p-6 sm:p-8 no-underline"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-10 md:items-center">
                {/* Left — role details */}
                <div>
                  <div className="text-mono text-[0.68rem] text-[var(--color-ember)] mb-2.5">
                    {o.academy}
                  </div>
                  <h3
                    className="text-cond text-white mb-3 group-hover:text-[var(--color-ember)] transition-colors"
                    style={{ fontSize: "clamp(1.9rem, 3vw, 2.6rem)" }}
                  >
                    {o.title}
                  </h3>

                  {/* Meta line */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/55 text-[0.82rem] mb-4">
                    <span>{o.location}</span>
                    <span className="text-white/20">·</span>
                    <span>{o.type}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-white/80">{o.comp}</span>
                  </div>

                  <p className="text-white/60 text-[0.9rem] leading-[1.65] max-w-[62ch]">
                    {o.blurb}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-5">
                    {o.tags.map((t) => (
                      <span
                        key={t}
                        className="text-mono text-[0.62rem] text-white/60 border border-[var(--color-line-2)] px-2.5 py-1"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right — CTA */}
                <div className="md:text-right shrink-0">
                  <span
                    className="inline-flex items-center gap-2.5 border-2 border-white/30 group-hover:border-[var(--color-ember)] group-hover:bg-[var(--color-ember)] group-hover:text-black text-white text-cond-md text-[0.82rem] transition-colors"
                    style={{ padding: "11px 24px" }}
                  >
                    View role &amp; apply →
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Open application note */}
        <p className="text-white/45 text-[0.85rem] mt-8">
          Don&apos;t see your role?{" "}
          <a
            href="mailto:info@extonsports.com?subject=General%20coaching%20interest"
            className="text-[var(--color-ember)] hover:text-[var(--color-ember-hi)] transition-colors"
          >
            Send us a note
          </a>{" "}
          — we&apos;re always glad to hear from strong coaches.
        </p>
      </div>
    </section>
  );
}
