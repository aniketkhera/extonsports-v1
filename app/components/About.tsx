"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Facility3D from "./Facility3D";
import WhatsAppButton from "./WhatsAppButton";
import { LEGAL_NAME, CONTACT_PHONE, CONTACT_PHONE_E164 } from "@/lib/legal";

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
                href={`tel:${CONTACT_PHONE_E164}`}
                className="hover:text-[var(--color-ember)] transition"
              >
                {CONTACT_PHONE}
              </a>
              {/*
                ⚠️ A2P 10DLC DISCLOSURE — THIS MUST STAY BESIDE THE NUMBER.
                Twilio's campaign pre-check refused the sibling SquashTigers registration
                until the consent language sat on the page where the number is ADVERTISED,
                not only on /sms. A reviewer opens the homepage, finds the number, and
                looks for consent right there. Moving this into a footer or behind a link
                re-breaks the registration.

                Every clause below is load-bearing and matches app/sms/page.tsx word for
                word: agreeing to receive texts, the named entity, what we send, frequency,
                cost, STOP and HELP. Change them together or not at all.

                Note the explicit space expression after LEGAL_NAME. JSX drops the literal
                space that follows an expression, which first rendered "EXTON LLCabout".
                For the same reason, do not move this note inside the paragraph: an
                expression container eats the whitespace on BOTH sides of itself, and a
                comment placed mid-sentence turned "text message replies" into
                "text messagereplies".
              */}
              <p className="mt-2 text-white/40 text-[0.72rem] leading-[1.55] max-w-[46ch]">
                By calling or texting this number you are agreeing to receive text message
                replies from {LEGAL_NAME}{" "}
                about membership, visits and court availability, at the number you
                contacted us from. We only reply and never text first.
                Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt
                out, or HELP for help. See our{" "}
                <Link href="/sms" className="underline hover:text-[var(--color-ember)] transition">
                  SMS Terms
                </Link>
                .
              </p>
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
              Open 24/7 · anyone can book
            </dd>
          </dl>

          <div className="flex flex-wrap items-center gap-3 mt-7">
            <a
              href="https://maps.app.goo.gl/t35BeZFRtdmZeLuo9"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 border-2 border-white/30 hover:border-[var(--color-ember)] text-white text-cond-md text-[0.85rem] no-underline transition"
              style={{ padding: "10px 24px" }}
            >
              Get directions →
            </a>
            <WhatsAppButton />
          </div>
          <p className="text-white/40 text-[0.8rem] mt-3">
            Follow our WhatsApp channel for events, court news &amp; updates.
          </p>

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
            background: "var(--scene-bg)",
          }}
        >
          <Facility3D />
        </motion.div>
      </div>
    </section>
  );
}
