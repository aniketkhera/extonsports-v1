import { WORKSHOP } from "../../lib/fitness-workshop";
import s from "./exit.module.css";
import w from "./workshop.module.css";

/* The workshop's panel on the exit-door screen (2026-10-21): the POWER x SeRa
   Fitness Health & Fitness Workshop, alternating with the Squash Starter Pack
   (ExitScreen decides when; workshop.module.css does the swap).

   The Starter Pack's grid (copy | middle | code) and its code card, so the two
   panels read as one screen: the middle column holds the organisers' logos,
   kept as asked (Aniket: "Retain the Sera Logo"), and the code opens
   www.extonsports.com/fitnessworkshop (public/fitnessworkshop/qr.svg, the
   flyer's code).

   No hooks and no heartbeat (the page that renders ExitScreen sends that). No
   entrance animations either: a panel that fades in every few seconds must not
   restart its own lines each time. What moves is ambient and runs for ever
   (2026-10-21, Aniket: "maybe add some animation to the sera workshop page"):
   music notes drifting up behind the copy, FREE pulsing, the logo tile floating,
   and the code's ring, as on the Starter Pack. Transform and opacity only.

   `panel` (2026-10-21, the vestibule's right half): the same content for a box
   about 1.3:1 — the copy over the logos on the left, the code on the right
   (workshop.module.css, .panelLayout). Unset, the markup is what /exit draws. */

/* Hand-placed, so the server and the browser agree (no Math.random in a render). */
const NOTES: Array<{ glyph: string; left: number; delay: number; dur: number; hue: string; size: number }> = [
  { glyph: "♪", left: 3, delay: 0.0, dur: 7.0, hue: "#f89b72", size: 2.6 },
  { glyph: "♫", left: 11, delay: 2.4, dur: 8.2, hue: "#79ea92", size: 2.2 },
  { glyph: "♪", left: 19, delay: 4.6, dur: 7.6, hue: "#ffbe97", size: 2.0 },
  { glyph: "♫", left: 27, delay: 1.2, dur: 8.8, hue: "#ffffff", size: 2.4 },
  { glyph: "♪", left: 35, delay: 3.5, dur: 7.2, hue: "#f89b72", size: 2.1 },
  { glyph: "♫", left: 42, delay: 5.8, dur: 8.0, hue: "#79ea92", size: 2.5 },
  { glyph: "♪", left: 7, delay: 6.4, dur: 7.8, hue: "#ffffff", size: 1.9 },
  { glyph: "♫", left: 31, delay: 7.1, dur: 7.4, hue: "#ffbe97", size: 2.2 },
];
export default function WorkshopHero({ className, panel = false }: { className?: string; panel?: boolean }) {
  const url = WORKSHOP.url.replace(/^https?:\/\/(www\.)?/, "");
  return (
    <section className={[s.hero, panel && w.panelLayout, className].filter(Boolean).join(" ")} aria-label={`${WORKSHOP.title}, ${WORKSHOP.day}`}>
      <div className={w.notes} aria-hidden>
        {NOTES.map((n, i) => (
          <span
            key={i}
            className={w.note}
            style={{
              left: `${n.left}%`,
              color: n.hue,
              fontSize: `calc(${n.size} * var(--vw))`,
              animationDelay: `${n.delay}s`,
              animationDuration: `${n.dur}s`,
            }}
          >
            {n.glyph}
          </span>
        ))}
      </div>
      <div className={`${s.copy} ${w.above}`}>
        <p className={w.present}>
          <b>POWER</b> &amp; <b>SeRa Fitness</b> present
        </p>
        <h2 className={s.title}>
          <span className={`${s.name} ${w.big}`}>Health &amp; Fitness</span>
          <span className={`${s.kicker} ${w.big}`}>Workshop</span>
        </h2>
        <p className={w.when}>
          <span className={w.day}>{WORKSHOP.dayShort}</span>
          <span className={w.time}>6 – 8 PM</span>
          {/* Free since 2026-10-21 (Aniket: "the dance workshop is now FREE, so
              highlight that, remove the $10 charge"). */}
          <span className={w.free}>Free</span>
        </p>
        <ul className={s.facts}>
          <li>A Bollywood-inspired workout</li>
          <li>With {WORKSHOP.instructors.join(" & ")}</li>
          <li>
            <strong>Free</strong> · light refreshments included
          </li>
        </ul>
      </div>

      <div className={w.logos}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static logo; next/image adds nothing here */}
        <img className={w.power} src="/fitnessworkshop/power-logo.webp" alt="POWER: Professional Women and Women Entrepreneurs Association" width={756} height={339} />
        <span className={w.with}>in association with</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static logo; next/image adds nothing here */}
        <img className={w.sera} src="/fitnessworkshop/sera-logo.webp" alt="SeRa Fitness" width={432} height={441} />
      </div>

      <div className={panel ? `${s.cta} ${w.ctaCell}` : s.cta}>
        <a className={s.buy} href={WORKSHOP.url} aria-label={`Register for the ${WORKSHOP.title}`}>
          <span className={s.scan}>SCAN TO REGISTER</span>
          <span className={s.card}>
            <span className={s.ring} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
            <img className={s.code} src="/fitnessworkshop/qr.svg" alt={`QR code: ${url}`} />
          </span>
        </a>
        <p className={s.after}>
          <span className={s.afterLead}>Reserve your spot</span>
          <span className={s.afterText}>Let&rsquo;s dance, connect and celebrate together!</span>
        </p>
        <a className={s.url} href={WORKSHOP.url}>{url}</a>
      </div>
    </section>
  );
}
