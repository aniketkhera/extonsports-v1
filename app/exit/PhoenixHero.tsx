import s from "./exit.module.css";
import c from "./ccca.module.css";
import p from "./phoenix.module.css";

/* Phoenix Throwball, a promotion on both promo walls (2026-10-26).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "let's remove the page from vestibule on squashtigers starter pack and show
   'Exton Sports Center - now home to the Phoenix Throwball Team!' - with their logo", with
   the team captain's name and mobile for enquiries, then "same look and feel as other
   slides on the vestibule display", then "and also on the 'outside' screen too". It takes
   the Starter Pack's place in promos.ts, so both walls change together. The headline since
   2026-10-26 (after it shipped): "New Home of the Phoenix Throwball Team", his words —
   "of", not "to", and no exclamation mark.

   NO CONTACT, since 2026-10-27 (Aniket: "from the screens (vestibule and outside), remove
   the contact information of Lima and her phone number"). The code that dialled her, its
   label and the "Scan or call" line are gone, and so is public/phoenix/qr.svg, which the
   site would otherwise go on serving. Her number is not repeated here either: this repo is
   public.

   THE WORDS ARE HIS, and only his: the headline and the team. Nothing else is claimed —
   no times, no "join", no price, and no other number in her place. The team plays Sundays
   on BADMINTON 1–3 (the calendar already says so), but he did not ask for that on the wall.

   THE PHOENIX MOVES (his ask: "animate the phoenix instead - spreading wings etc."; the
   first mock-up's throw over a net is gone). The team's artwork (phoenix.jpg, its white
   background cut out) is three layers on one 768 px canvas in public/phoenix/:
   wing-left.webp, wing-right.webp and body.webp — head, chest, the PHOENIX banner and the
   tail — drawn last, overlapping each wing by a few pixels, so a wing turning a few
   degrees at its shoulder opens no seam. Every 8 s the wings rise and spread open, beat
   twice and rise again (phoenix.module.css). Stacked still, the three are the logo exactly.

   With the code gone, the phoenix takes the code's place: copy on the left, the bird on
   the right, on both walls (phoenix.module.css .grid, .art). The title and motto are the
   Starter Pack's and CCCA's classes (exit.module.css, ccca.module.css), so the panels read
   as one screen. No hooks and no heartbeat (the page that renders this sends that). */

/** The team's logo, its wings on their own layers so they can move (see the header). */
function PhoenixMark({ className }: { className: string }) {
  return (
    <span className={`${p.mark} ${className}`} aria-hidden>
      <span className={p.flare} />
      <span className={p.bird}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static layers; next/image adds nothing here */}
        <img className={p.wingL} src="/phoenix/wing-left.webp" alt="" width={768} height={768} />
        {/* eslint-disable-next-line @next/next/no-img-element -- static layers; next/image adds nothing here */}
        <img className={p.wingR} src="/phoenix/wing-right.webp" alt="" width={768} height={768} />
        {/* eslint-disable-next-line @next/next/no-img-element -- static layers; next/image adds nothing here */}
        <img className={p.layer} src="/phoenix/body.webp" alt="" width={768} height={768} />
      </span>
    </span>
  );
}

export default function PhoenixHero({ className, panel = false }: { className?: string; panel?: boolean }) {
  return (
    <section
      className={[s.hero, p.grid, panel && c.panelLayout, panel && p.panel, className].filter(Boolean).join(" ")}
      aria-label="Exton Sports Center, new home of the Phoenix Throwball Team"
    >
      <div className={s.copy}>
        <p className={c.motto}>Exton Sports Center</p>
        <p className={p.home}>New home of the</p>
        <h2 className={s.title}>
          <span className={`${s.name} ${c.big}`}>Phoenix</span>
          <span className={`${s.kicker} ${c.big}`}>Throwball Team</span>
        </h2>
      </div>

      <div className={p.art} aria-hidden>
        <PhoenixMark className={p.logo} />
      </div>
    </section>
  );
}
