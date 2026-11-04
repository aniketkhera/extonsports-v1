"use client";

import { motion } from "framer-motion";
import { ASKS, MESSAGES } from "../our-club/words";

/* The players' message under the About section's floor plan (2026-11-03).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "comtinuing on the "neighborhood club, keep it clean/etc" theme.. add those
   messages on teh website too - somewhere below the graphic perhaps". The words are the
   exit-door TV's (app/our-club/words.tsx, one copy for both): the first of its five
   messages — "This is your club." — and the same four asks. The TV turns through all
   five headlines; a page is read, not walked past, so here it is one, standing still.

   Every colour is a token or a remapped text-white/NN class, so the light theme needs
   nothing of its own (globals.css, "Light-theme utility remaps"). The tiles are hairline
   cells — the grid's own background shows through a 1px gap — as the page draws its
   other quiet panels. */

const MESSAGE = MESSAGES[0];

export default function OurClubNote() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="mt-8"
    >
      <div className="text-cond-md text-[0.74rem] text-[var(--color-ember)] mb-2.5">
        {MESSAGE.kicker[0].replace(/ · $/, "")}
      </div>
      <h3 className="text-cond text-white" style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.4rem)" }}>
        {MESSAGE.head[0]} <span className="text-[var(--color-ember)]">{MESSAGE.head[1]}</span>
      </h3>
      <p className="text-white/60 text-[0.92rem] leading-[1.65] mt-2 max-w-[54ch]">{MESSAGE.lead}</p>

      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--color-line-2)] border border-[var(--color-line-2)]">
        {ASKS.map((a) => (
          <li key={a.key} className="flex items-start gap-3.5 bg-[var(--color-void)] px-4 py-3.5">
            <span className="shrink-0 mt-0.5 [&_svg]:block [&_svg]:w-8 [&_svg]:h-8 [&_svg]:fill-none [&_svg]:stroke-[var(--color-ember)] [&_svg]:[stroke-width:2.4] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]">
              {a.icon}
            </span>
            <span>
              <span className="block text-cond-md text-white text-[0.95rem]">{a.title.join(" ")}</span>
              <span className="block text-white/55 text-[0.82rem] leading-[1.5] mt-0.5">{a.web ?? a.line}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-white/40 text-[0.8rem] mt-3">{MESSAGE.thanks}</p>
    </motion.div>
  );
}
