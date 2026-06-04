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
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const item = {
  hidden:  { opacity: 0, y: 16, scale: 0.9 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function TrustStrip() {
  return (
    <div
      className="relative bg-[#0A0A0A] border-b border-[var(--color-line)] overflow-hidden"
      style={{ padding: "26px 24px", paddingInline: "clamp(24px, 4vw, 48px)" }}
    >
      {/* Animated orange sweep line across the top */}
      <motion.div
        className="absolute top-0 left-0 h-[2px] bg-[var(--color-ember)]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left", width: "100%" }}
      />

      {/* Subtle ambient glow behind the whole strip */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(60% 120% at 50% 0%, rgba(243,122,74,0.07) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="relative grid grid-cols-2 sm:grid-cols-5 gap-4 sm:flex sm:justify-around sm:items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={container}
      >
        {stats.map((s, i) => (
          <div key={s.lab} className="contents">
            <motion.div
              className="flex flex-col items-center gap-[4px] cursor-default"
              variants={item}
              whileHover={{ scale: 1.12 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="text-cond leading-none"
                style={{
                  fontSize: "clamp(1.8rem, 2.6vw, 2.2rem)",
                  color: "var(--color-ember)",
                  textShadow: "0 0 28px rgba(243,122,74,0.0)",
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ textShadow: "0 0 28px rgba(243,122,74,0.7)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {s.num}
              </motion.div>
              <div className="text-mono text-[0.66rem] text-white/50 tracking-widest">
                {s.lab}
              </div>
            </motion.div>
            {i < stats.length - 1 && (
              <div
                aria-hidden
                className="hidden sm:block w-px bg-[var(--color-line-2)]"
                style={{ height: 38 }}
              />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
