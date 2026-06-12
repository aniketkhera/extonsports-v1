"use client";

import { motion } from "framer-motion";
import Facility3D from "./Facility3D";

export default function About() {
  return (
    <section
      id="about"
      className="relative px-4 sm:px-6 md:px-12 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1280px] grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Copy column */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-cond-md text-[0.74rem] text-[var(--color-ember)] mb-3.5">
            Exton, PA · open 24/7
          </div>
          <h2
            className="text-cond text-white mb-5"
            style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)" }}
          >
            More than a gym.
            <br />
            A <span className="text-[var(--color-ember)]">full sports club</span>.
          </h2>
          <p className="text-white/60 text-[0.94rem] leading-[1.7] mb-3 max-w-[48ch]">
            Exton Sports Center is a multi-sport facility in
            Chester County — cricket, squash, badminton and indoor turf under
            one roof, open round the clock.
          </p>

          <dl className="mt-6 pt-5 border-t border-[var(--color-line-2)] grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
            <dt className="text-mono text-[0.7rem] text-white/35">Address</dt>
            <dd className="text-white/80 text-[0.92rem]">
              4 Tabas Lane, Building&nbsp;2 · Exton, PA 19341
              <br /><span className="text-white/50 text-[0.82rem]">Opposite Apna Bazar</span>
            </dd>
            <dt className="text-mono text-[0.7rem] text-white/35">Phone</dt>
            <dd className="text-white/80 text-[0.92rem]">
              <a
                href="tel:6096190999"
                className="hover:text-[var(--color-ember)] transition"
              >
                609-619-0999
              </a>
            </dd>
            <dt className="text-mono text-[0.7rem] text-white/35">Email</dt>
            <dd className="text-white/80 text-[0.92rem]">
              <a
                href="mailto:info@extonsports.com"
                className="hover:text-[var(--color-ember)] transition"
              >
                info@extonsports.com
              </a>
            </dd>
            <dt className="text-mono text-[0.7rem] text-white/35">Hours</dt>
            <dd className="text-white/80 text-[0.92rem]">
              Open 24/7 · members and guests only
            </dd>
          </dl>

          <a
            href="https://maps.app.goo.gl/t35BeZFRtdmZeLuo9"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 mt-7 border-2 border-white/30 hover:border-[var(--color-ember)] text-white text-cond-md text-[0.85rem] no-underline transition"
            style={{ padding: "10px 24px" }}
          >
            Get directions →
          </a>

        </motion.div>

        {/* Visual column — rotating 3D facility rendering */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.7 }}
          className="relative border border-[var(--color-line-2)] overflow-hidden"
          style={{
            height: "min(420px, 80vw)",
            background:
              "linear-gradient(135deg, rgba(248,155,114,0.16) 0%, rgba(0,0,0,0) 60%), radial-gradient(120% 80% at 100% 100%, rgba(66,181,77,0.16) 0%, transparent 70%), #0C1623",
          }}
        >
          <Facility3D />
        </motion.div>
      </div>
    </section>
  );
}
