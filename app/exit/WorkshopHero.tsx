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

   Static: no hooks, no heartbeat (the page that renders ExitScreen sends that),
   and no entrance animations, because a panel that fades in every 10 s must not
   restart its own lines each time. */
export default function WorkshopHero({ className }: { className?: string }) {
  const url = WORKSHOP.url.replace(/^https?:\/\/(www\.)?/, "");
  return (
    <section className={`${s.hero} ${className ?? ""}`} aria-label={`${WORKSHOP.title}, ${WORKSHOP.day}`}>
      <div className={s.copy}>
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

      <div className={s.cta}>
        <a className={s.buy} href={WORKSHOP.url} aria-label={`Register for the ${WORKSHOP.title}`}>
          <span className={s.scan}>SCAN TO REGISTER</span>
          <span className={s.card}>
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
