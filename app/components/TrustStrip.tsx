"use client";

import { motion } from "framer-motion";

const stats = [
  { num: "2",    lab: "Cricket lanes" },
  { num: "3",    lab: "Squash · all-glass" },
  { num: "4",    lab: "Badminton courts" },
  { num: "1",    lab: "Indoor turf" },
  { num: "24/7", lab: "Always open" },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const item = {
  hidden:  { opacity: 0, y: 16, scale: 0.9 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function TrustStrip() {
  return (
    <div
      className="bg-[#0A0A0A] border-y border-[var(--color-line)]"
      style={{ padding: "22px 24px", paddingInline: "clamp(24px, 4vw, 48px)" }}
    >
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:flex sm:justify-around sm:items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={container}
      >
        {stats.map((s, i) => (
          <div key={s.lab} className="contents">
            <motion.div
              className="flex flex-col items-center gap-[3px]"
              variants={item}
            >
              <motion.div
                className="text-cond text-[1.85rem] text-[var(--color-ember)] leading-none"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {s.num}
              </motion.div>
              <div className="text-mono text-[0.66rem] text-white/45">
                {s.lab}
              </div>
            </motion.div>
            {i < stats.length - 1 && (
              <div
                aria-hidden
                className="hidden sm:block w-px bg-[var(--color-line-2)]"
                style={{ height: 34 }}
              />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
