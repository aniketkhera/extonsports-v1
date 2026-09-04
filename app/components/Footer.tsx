import WhatsAppButton from "./WhatsAppButton";
import { CONTACT_EMAIL } from "../../lib/legal";
import { RATE_BANDS, BAND_BLURB, capFor, CAP_HOURS, SPORT_ORDER } from "../../lib/rates";
import { playerCapsOrFallback } from "../../lib/club-pricing";

export default async function Footer() {
  const year = new Date().getFullYear();
  // Read from the platform, which owns these rows. Falls back to the local
  // copy when it cannot be reached — see lib/club-pricing.ts.
  const { caps } = await playerCapsOrFallback();
  const sports = SPORT_ORDER.filter((s) => caps[s]);
  return (
    <footer className="bg-[var(--footer-bg)] border-t border-[var(--footer-line)]">
      {/* ── HOW PRICING WORKS ────────────────────────────────────────────
          The band hours live here, not in the hero, and not under the price
          table's column headings where they were tried first. A price table is
          scanned — "what does squash cost" — and six time windows wedged into
          its header made that harder, not easier. Down here there is room to
          say what a band IS rather than just when it runs, which is the part a
          first-time visitor actually needs.

          Everything is derived from lib/rates.ts, so the hours, the caps and
          the hero's table cannot disagree with each other. They already did
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
          covers the whole court — nobody pays separately, up to the limit for
          that time.
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
          <p className="m-0">
            <span className="text-white/65">Friday and Saturday nights are different.</span>{" "}
            From 10pm to midnight those two nights are charged at the off-peak
            rate rather than late night.
          </p>
          <p className="m-0">
            <span className="text-white/65">How many can share a court depends on the band and on how long you book.</span>{" "}
            A longer booking is people rotating on and off, so it takes more of
            them. The person who books counts towards the total.
          </p>

          {/* A table, not a sentence. The rule has two dimensions now — band and
              duration — and the prose version had to say "that doubles", which
              was true of squash and of nothing else. */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full max-w-[430px] border-collapse text-[0.8rem]">
              <caption className="text-left text-mono text-[0.56rem] tracking-widest uppercase text-white/35 pb-2">
                Players per court, including you
              </caption>
              <thead>
                <tr className="text-white/45">
                  <th scope="col" className="text-left font-normal py-1 pr-3" />
                  {CAP_HOURS.map((h) => (
                    <th key={h} scope="col" className="text-right font-normal py-1 px-2 tabular-nums">
                      {h} hr{h > 1 ? "s" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sports.map((sport) => (
                  <tr key={sport} className="border-t border-[var(--footer-line)]">
                    <th scope="row" className="text-left font-normal text-white/65 py-[5px] pr-3 whitespace-nowrap">
                      {sport}
                    </th>
                    {CAP_HOURS.map((h) => (
                      <td key={h} className="text-right py-[5px] px-2 tabular-nums text-white/70">
                        {capFor(caps[sport].offPeak, h)}
                        <span className="text-white/30"> ({capFor(caps[sport].peak, h)})</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 text-white/35 text-[0.76rem]">
            Off-peak and late night, with <span className="text-white/50">peak in brackets</span>.
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
            { label: "Book a court", href: "/#top" },
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
