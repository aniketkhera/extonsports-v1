import b from "./birthday.module.css";

/* A birthday greeting on the exit-door screen, for ONE evening (2026-10-21).
   Aniket: "the screen should read "Happy birthday Ayansh Ajmera from Chester County
   Cricket Academy and Exton Sports Center". Use the logo of CCCA and Exton Sports
   Center. Start this page from 3pm today till midnight today. After midnight, remove
   that page."

   ExitScreen shows it only inside BIRTHDAY's window, on the SCREEN's clock (the same
   30 s ticker as the workshop panel), so it appears at 3pm and leaves at midnight
   with no deploy and no reload. The code itself comes out in a follow-up commit.

   The Exton mark is the globe's still image, not <LogoGlobe>: that draws a canvas,
   the header already runs one, and the VIZIO's browser is weak. No heartbeat here,
   and only transform/opacity move (exit.module.css's rules). */

export const BIRTHDAY = {
  name: "Ayansh Ajmera",
  /** 3:00 PM EDT, Wed 21 Oct 2026. */
  startsAt: "2026-10-21T19:00:00Z",
  /** Midnight EDT, the start of Thu 22 Oct 2026. */
  endsAt: "2026-10-22T04:00:00Z",
} as const;

/* Balloons rising up both sides, clear of the name (it spans about 18% to 81%) (2026-10-21, Aniket: "and also
   to the happy birthday page"). Hand-placed, like the confetti. */
const BALLOONS: Array<{ left: number; delay: number; dur: number; hue: string; size: number }> = [
  { left: 1.5, delay: 0.0, dur: 11.0, hue: "#f89b72", size: 1.0 },
  { left: 6.5, delay: 4.2, dur: 12.5, hue: "#79ea92", size: 0.85 },
  { left: 11.5, delay: 8.0, dur: 10.5, hue: "#ffbe97", size: 0.9 },
  { left: 85, delay: 2.0, dur: 12.0, hue: "#79ea92", size: 0.9 },
  { left: 90, delay: 6.1, dur: 10.8, hue: "#f89b72", size: 1.05 },
  { left: 95, delay: 9.3, dur: 11.6, hue: "#ffffff", size: 0.8 },
];

/* A few pieces of confetti, placed by hand so the server and the browser agree (no
   Math.random in a render). Each falls on its own clock; transform and opacity only. */
const CONFETTI: Array<{ left: number; delay: number; dur: number; hue: string; rot: number; w: number }> = [
  { left: 4, delay: 0.0, dur: 6.2, hue: "#f89b72", rot: 20, w: 1.0 },
  { left: 11, delay: 2.1, dur: 5.4, hue: "#79ea92", rot: -35, w: 0.8 },
  { left: 19, delay: 4.0, dur: 6.8, hue: "#ffbe97", rot: 55, w: 1.1 },
  { left: 27, delay: 1.2, dur: 5.9, hue: "#ffffff", rot: -15, w: 0.7 },
  { left: 36, delay: 3.3, dur: 6.4, hue: "#f89b72", rot: 40, w: 0.9 },
  { left: 45, delay: 0.6, dur: 5.6, hue: "#79ea92", rot: -60, w: 1.0 },
  { left: 54, delay: 2.8, dur: 6.6, hue: "#ffbe97", rot: 10, w: 0.8 },
  { left: 63, delay: 4.6, dur: 5.8, hue: "#ffffff", rot: 70, w: 1.1 },
  { left: 72, delay: 1.7, dur: 6.1, hue: "#f89b72", rot: -25, w: 0.9 },
  { left: 81, delay: 3.8, dur: 5.5, hue: "#79ea92", rot: 35, w: 1.0 },
  { left: 89, delay: 0.9, dur: 6.9, hue: "#ffbe97", rot: -50, w: 0.8 },
  { left: 96, delay: 2.5, dur: 6.0, hue: "#ffffff", rot: 15, w: 0.7 },
];

export default function BirthdayHero({ className }: { className?: string }) {
  return (
    <section className={`${b.hero} ${className ?? ""}`} aria-label={`Happy birthday, ${BIRTHDAY.name}`}>
      <div className={b.balloons} aria-hidden>
        {BALLOONS.map((bl, i) => (
          <span
            key={i}
            className={b.balloon}
            style={{
              left: `${bl.left}%`,
              width: `calc(${4.2 * bl.size} * var(--vw))`,
              height: `calc(${5.2 * bl.size} * var(--vw))`,
              ["--hue" as string]: bl.hue,
              animationDelay: `${bl.delay}s`,
              animationDuration: `${bl.dur}s`,
            }}
          />
        ))}
      </div>
      <div className={b.confetti} aria-hidden>
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className={b.piece}
            style={{
              left: `${c.left}%`,
              background: c.hue,
              width: `calc(${0.55 * c.w} * var(--vw))`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
              rotate: `${c.rot}deg`,
            }}
          />
        ))}
      </div>

      <div className={b.card}>
        <p className={b.happy} aria-label="Happy Birthday">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
          <img className={b.ball} src="/reception/cricket-ball.svg" alt="" />
          {/* Letter by letter, each on its own delay: a wave that runs along the words. */}
          <span className={b.wave} aria-hidden>
            {"Happy Birthday".split("").map((ch, i) => (
              <span key={i} className={ch === " " ? b.gap : b.letter} style={{ animationDelay: `${i * 0.08}s` }}>
                {ch === " " ? "\u00a0" : ch}
              </span>
            ))}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
          <img className={b.ball} src="/reception/cricket-ball.svg" alt="" />
        </p>
        <h2 className={b.name}>{BIRTHDAY.name}</h2>

        <p className={b.from}>from</p>
        <div className={b.senders}>
          <div className={b.sender}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a static logo; next/image adds nothing here */}
            <img className={b.ccca} src="/academies/ccca-crest.png" alt="Chester County Cricket Academy" width={400} height={360} />
            <span className={b.senderName}>Chester County Cricket Academy</span>
          </div>
          <span className={b.and}>&amp;</span>
          <div className={b.sender}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a static logo; next/image adds nothing here */}
            <img className={b.globe} src="/logo-globe.webp" alt="Exton Sports Center" width={640} height={640} />
            <span className={b.senderName}>Exton Sports Center</span>
          </div>
        </div>
      </div>
    </section>
  );
}
