import s from "./exit.module.css";
import c from "./ccca.module.css";

/* Chester County Cricket Academy, a promotion on both promo walls (2026-10-22).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, with the academy's flyer: "one more thing with the vestibule and the outside
   screens - can we change this attached to the look and feel of exton sports and add a
   page (pages rotate) for this."

   THE WORDS ARE THE FLYER'S, cut to what a wall can say in five seconds: the motto, the
   name, "building better cricketers for a brighter future", the five player groups,
   free sessions for girls once a week, a free assessment for new players, two or more
   two-hour sessions a week, and the academy contact, Sachin Zope, (484) 919-5929. The
   flyer's program-feature tiles (expert coaching, small groups ...) are left on the
   flyer: six more tiles would be read by nobody walking past.

   THE CODE opens https://cccricketacademy.com/, the flyer's address, checked live
   2026-10-22 (200). Its home page says "Enrollments for Junior GIRLS AND BOYS cricket
   coaching are Open NOW !! Call us!", hence ENROLLMENTS OPEN over the code and the call
   under it. public/ccca/qr.svg is GENERATED from that URL (python segno, version 3,
   error level Q, 4-module quiet zone, dark #0B1623 on white): change the URL,
   regenerate it, and decode it off a screenshot before shipping.

   The grid (copy | crest | code), the title, the tick list and the code card are the
   Starter Pack's (exit.module.css), so the three panels read as one screen. `panel` is
   the vestibule's right half (ccca.module.css .panelLayout), as for the others.

   No hooks and no heartbeat (the page that renders this sends that), and only
   transform and opacity move: the crest floats, FREE pulses, a ball hops up the five
   groups, the code's ring pings. */

const CCCA_URL = "https://cccricketacademy.com/";

/** The flyer's five groups, in order. The bar heights are the hop's landing heights in
 *  ccca.module.css (@keyframes hop): change one, change both. */
const GROUPS: Array<{ name: string; h: number }> = [
  { name: "Rookies", h: 30 },
  { name: "Beginners", h: 46 },
  { name: "Intermediate", h: 62 },
  { name: "Advanced", h: 80 },
  { name: "Elite", h: 100 },
];

export default function CccaHero({ className, panel = false }: { className?: string; panel?: boolean }) {
  const url = CCCA_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <section
      className={[s.hero, panel && c.panelLayout, className].filter(Boolean).join(" ")}
      aria-label="Chester County Cricket Academy"
    >
      <div className={s.copy}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static logo; next/image adds nothing here */}
        <img className={c.crestInline} src="/academies/ccca-crest.png" alt="" width={400} height={360} />
        <p className={c.motto}>
          Learn · Practice · Improve · <b>Achieve</b>
        </p>
        <h2 className={s.title}>
          <span className={`${s.name} ${c.big}`}>Chester County</span>
          <span className={`${s.kicker} ${c.big}`}>Cricket Academy</span>
        </h2>
        <p className={c.tagline}>Building better cricketers for a brighter future</p>

        <div className={c.ladder} aria-label="Five player groups: Rookies, Beginners, Intermediate, Advanced, Elite">
          <div className={c.ladderHead}>Five player groups</div>
          <div className={c.bars} aria-hidden>
            {GROUPS.map((g, i) => (
              <span key={g.name} className={i === GROUPS.length - 1 ? `${c.bar} ${c.top}` : c.bar} style={{ height: `${g.h}%` }} />
            ))}
            <span className={c.mover}>
              <span className={c.ball}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
                <img src="/reception/cricket-ball.svg" alt="" />
              </span>
            </span>
          </div>
          <div className={c.names} aria-hidden>
            {GROUPS.map((g) => (
              <span key={g.name}>{g.name}</span>
            ))}
          </div>
        </div>

        <ul className={s.facts}>
          <li>
            <span className={c.free}>Free</span>cricket sessions for girls, once a week
          </li>
          <li>
            <strong>Free assessment</strong> for new players
          </li>
          <li>Two or more sessions a week, two hours each</li>
        </ul>
      </div>

      <div className={c.crestCol} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static logo; next/image adds nothing here */}
        <img className={c.crest} src="/academies/ccca-crest.png" alt="" width={400} height={360} />
      </div>

      <div className={s.cta}>
        {/* The code and its label are ONE link, as on the other panels: the page is public,
            and nobody can scan a code on their own phone's screen. Inert on a television. */}
        <a className={s.buy} href={CCCA_URL} aria-label="Chester County Cricket Academy: enrollments open">
          <span className={s.scan}>ENROLLMENTS OPEN</span>
          <span className={s.card}>
            <span className={s.ring} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing here */}
            <img className={s.code} src="/ccca/qr.svg" alt={`QR code: ${url}`} />
          </span>
        </a>
        <p className={s.after}>
          <span className={s.afterLead}>Or call the academy</span>
          <span className={s.afterText}>
            Sachin Zope
            <span className={c.phone}>(484) 919-5929</span>
          </span>
        </p>
        <a className={s.url} href={CCCA_URL}>{url}</a>
      </div>
    </section>
  );
}
