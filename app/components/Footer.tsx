import WhatsAppButton from "./WhatsAppButton";
import OrangishPill from "./OrangishPill";
import { CONTACT_EMAIL } from "../../lib/legal";
import { BOOK_COURT_URL, PAY_URL } from "../../lib/booking";
import { RATE_BANDS, BAND_BLURB } from "../../lib/rates";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[var(--footer-bg)] border-t border-[var(--footer-line)]">
      {/* ── HOW PRICING WORKS ────────────────────────────────────────────
          The band hours live here, not in the hero, and not under the price
          table's column headings where they were tried first. A price table is
          scanned — "what does squash cost" — and six time windows wedged into
          its header made that harder, not easier. Down here there is room to
          say what a band IS rather than just when it runs, which is the part a
          first-time visitor actually needs.

          Everything is derived from lib/rates.ts, so the hours and the hero's
          table cannot disagree with each other. They already did
          once: this page advertised weekday peak as 4–9pm while the club
          charged peak until 10pm, and weekend peak as 8am–4pm against an
          actual 8am–8pm. Every gap under-stated the price. */}
      <section
        className="mx-auto max-w-[1280px] border-b border-[var(--footer-line)]"
        style={{ padding: "48px clamp(20px,4vw,48px) 44px" }}
        aria-labelledby="pricing-explainer"
      >
        <h3
          id="pricing-explainer"
          className="text-mono text-[0.65rem] text-white/35 mb-4 tracking-widest uppercase"
        >
          How pricing works
        </h3>
        <p className="text-white/55 text-sm max-w-[62ch] mb-4 leading-relaxed">
          Courts are booked by the hour and priced by when you play. One rate
          covers the whole court — nobody pays separately.
        </p>
        {/* Sits with the pricing rather than buried in the legal pages. It is a
            condition of playing, and somebody reading "one rate covers the
            whole court" should learn about it here rather than at the door. */}
        <p className="text-white/55 text-sm max-w-[62ch] mb-8 leading-relaxed">
          <span className="text-white/80">Everyone playing needs their own profile.</span>{" "}
          Add them when you book and they get a link to set one up — it takes a
          minute. It is how the club knows who was on court, and how everyone
          signs the same waiver, which is what protects all of you if somebody
          gets hurt.
        </p>

        <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {RATE_BANDS.map((b) => (
            <div key={b.key}>
              <dt className="text-mono text-[0.62rem] tracking-widest uppercase text-white/45 mb-2">
                {b.label}
              </dt>
              <dd className="m-0">
                <span className="block text-white/70 text-sm">
                  Mon&ndash;Fri {b.weekday}
                </span>
                <span className="block text-white/70 text-sm">
                  Sat/Sun {b.weekend}
                </span>
                <span className="block text-white/40 text-[0.78rem] mt-2 leading-relaxed">
                  {BAND_BLURB[b.key]}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3 text-[0.82rem] text-white/45 max-w-[68ch] leading-relaxed">
          {/* The "Friday and Saturday nights are different" paragraph lived
              here until 2026-10-08. It existed only because every OTHER night
              from 10pm was late night, and those two were the exception at the
              off-peak rate. With late night abolished there is no exception
              left to draw — all seven nights are off-peak from 9pm (10pm until 2026-10-15) — so the
              paragraph went rather than being reworded into a tautology. */}
          {/* A recommendation, not a table of limits — Aniket, 2026-10-13: "let's remove
              the number of people only - just say we recommend no more than 4 per court
              for squash, 6 per court for badminton and 8 per lane for cricket. let's not
              put these numbers up, either on the website or on the booking window."
              The per-court and lanes-together tables that stood here earlier that day
              (#97, #98) are in git; the caps they printed still live on the platform
              (court_player_limits, court_group_player_limits) and are still enforced
              there — they are just no longer published. The booking page says the same
              (orangish-app lib/guest-court-booking-rules.ts recommendedPerCourt). */}
          <p className="m-0">
            <span className="text-white/65">
              We recommend no more than 4 players per court for squash, 6 per court for
              badminton and 8 per lane for cricket.
            </span>{" "}
            The person who books counts towards the total.
          </p>

        </div>
      </section>

      {/* Three centered columns */}
      <div
        className="mx-auto max-w-[1280px] flex flex-wrap justify-center gap-16 md:gap-24"
        style={{ padding: "48px clamp(20px,4vw,48px) 36px" }}
      >
        <FooterCol
          title="Explore"
          links={[
            { label: "Sports", href: "/#sports" },
            { label: "Get directions", href: "https://maps.app.goo.gl/pX53mpfkSt81DBnh6" },
          ]}
        />
        <FooterCol
          title="Play"
          links={[
            { label: "Court rates", href: "/#top" },
            { label: "Book a court or lane", href: BOOK_COURT_URL },
            { label: "Make an adhoc payment", href: PAY_URL },
            { label: "Bulk & block bookings", href: `mailto:${CONTACT_EMAIL}` },
            { label: "Academies & juniors", href: "/#top" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Disclaimer", href: "/disclaimer" },
            { label: "SMS Terms", href: "/sms" },
          ]}
        />
      </div>

      {/* Follow on WhatsApp — centered CTA */}
      <div
        className="flex justify-center"
        style={{ padding: "0 clamp(20px,4vw,48px) 40px" }}
      >
        <WhatsAppButton label="Follow us on WhatsApp" />
      </div>

      {/* Bottom bar — centered */}
      <div
        className="border-t border-[var(--footer-line)] flex items-center justify-center"
        style={{ padding: "18px clamp(20px,4vw,48px)" }}
      >
        <p className="text-[0.7rem] text-white/25 text-center">
          © {year} Exton Sports Center · All rights reserved
          {/* 2026-10-15: Aniket asked for a small orangish.io credit on every Exton
              surface, and later that day for it as a pill (see OrangishPill), at
              this line's own size. Joined with a dot where the line has room; on a
              phone the joined line would wrap mid-phrase, so it takes a line of its
              own instead. Same tab, deliberately. */}
          <span className="block sm:inline">
            <span className="hidden sm:inline">{" · "}</span>
            <OrangishPill />
          </span>
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="text-center">
      <h4 className="text-mono text-[0.65rem] text-white/35 mb-4 tracking-widest">
        {title.toUpperCase()}
      </h4>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-white/55 hover:text-white transition"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
