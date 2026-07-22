import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: "Head Cricket Coach — Careers",
  description:
    "Founding Head Cricket Coach for a brand-new youth cricket academy in the Greater Philadelphia area. Full-time, $55,000–$70,000/yr + incentives, visa sponsorship available.",
  alternates: { canonical: "/careers/head-cricket-coach" },
  openGraph: {
    title: "Head Cricket Coach — Excel Cricket Academy",
    description:
      "Found a brand-new youth cricket academy from zero in Greater Philadelphia. Full-time · $55,000–$70,000/yr + incentives · visa sponsorship available.",
    url: "https://extonsports.com/careers/head-cricket-coach",
    type: "website",
  },
};

const APPLY_MAILTO =
  "mailto:info@extonsports.com?subject=Application%3A%20Head%20Cricket%20Coach&body=Please%20attach%20your%20resume%2C%20a%20brief%20cover%20letter%20describing%20your%20coaching%20philosophy%2C%20and%20two%20professional%20references.";

// ── Content model (kept as data so the page stays easy to edit) ──────────
const meta = [
  { k: "Location", v: "Philadelphia, PA (on-site)" },
  { k: "Employment type", v: "Full-time · Exempt" },
  { k: "Reports to", v: "Academy Director / Board of Directors" },
  {
    k: "Compensation",
    v: "$55,000–$70,000/yr, commensurate with experience, plus performance incentives",
  },
];

const responsibilities: { group: string; items: string[] }[] = [
  {
    group: "Academy Launch & Ecosystem Integration",
    items: [
      "Lead the ground-up build of the academy: establish training infrastructure, ground/facility arrangements, equipment procurement, and initial program structure.",
      "Drive founding-cohort player recruitment through community outreach, local school and league partnerships, clinics, and open trials.",
      "Complete USA Cricket affiliation and registration for the academy, and align the program with USA Cricket's development pathways, coaching standards, and eligibility requirements.",
      "Build relationships with regional cricket leagues, clubs, and USA Cricket regional bodies to secure the academy's standing in the local cricket community from day one.",
      "Register and enter academy teams into appropriate local, regional, and national competitions, managing scheduling, logistics, and compliance with league requirements.",
      "Represent the academy in ecosystem-building activities — league meetings, USA Cricket events, and partnerships with other clubs/academies — to establish credibility and visibility early on.",
    ],
  },
  {
    group: "Coaching & Player Development",
    items: [
      "Design and deliver age-appropriate training programs across batting, bowling, fielding, and wicket-keeping for players roughly ages 6–18.",
      "Run individual, small-group, and team practice sessions with a focus on technical skill, game awareness, physical conditioning, and mental resilience.",
      "Assess players regularly, set development goals, and track progress across skill levels.",
      "Prepare teams for local, regional, and national youth competitions, including match-day strategy and in-game management.",
    ],
  },
  {
    group: "Program Leadership",
    items: [
      "Build and maintain a structured, season-long coaching curriculum and practice calendar.",
      "Recruit, train, and supervise assistant and volunteer coaches, ensuring consistent coaching standards.",
      "Support player recruitment, tryouts, team selection, and roster management.",
      "Organize camps, clinics, and off-season development programs.",
    ],
  },
  {
    group: "Communication & Community",
    items: [
      "Serve as the primary point of contact for players and parents on athletic development.",
      "Foster a positive, inclusive, and disciplined team culture rooted in sportsmanship and respect.",
      "Represent the academy at local leagues, tournaments, and community events, and help grow participation in the Philadelphia area.",
    ],
  },
  {
    group: "Operations & Safety",
    items: [
      "Ensure all sessions meet health, safety, and child-protection standards, including proper equipment use and injury-prevention protocols.",
      "Maintain equipment and coordinate facility and ground scheduling.",
      "Keep accurate records of attendance, evaluations, and incident reports.",
    ],
  },
];

const required = [
  "Proven playing and/or coaching experience in cricket at a competitive level (club, collegiate, semi-professional, or higher).",
  "3+ years of coaching experience, ideally including youth development.",
  "A recognized coaching certification (e.g., ECB, Cricket Australia, ICC, or USA Cricket Level 2+) or willingness to obtain USA Cricket certification within an agreed timeframe.",
  "Strong knowledge of modern cricket techniques, formats (including T20), and player-development pathways.",
  "Comfort operating in a startup/founding environment — able to build systems, curriculum, and processes without an existing playbook to follow.",
  "Demonstrated high-performance coaching experience — working with elite, representative, or pathway-level athletes (e.g., state/national age-group squads, first-class academies, or professional pathway programs), with the ability to design and deliver high-performance training plans, strength/conditioning coordination, and individualized athlete development pathways.",
  "Excellent communication, organization, and leadership skills.",
  "Ability to pass a background check and complete youth-safety / SafeSport certification.",
];

const preferred = [
  "Direct experience launching or standing up a new youth cricket or sports academy/program from scratch in the U.S., including navigating governing-body affiliation.",
  "Existing relationships within USA Cricket, regional leagues, or the Minor/Major League Cricket pathway ecosystem.",
  "Current First Aid/CPR certification.",
  "Valid driver's license for travel to matches and tournaments.",
];

const conditions = [
  "Full-time schedule with regular evening and weekend hours during the season, aligned to practices, matches, and tournaments.",
  "Work is primarily outdoors on cricket grounds and indoors in nets/training facilities; requires physical activity, demonstration of techniques, and standing for extended periods.",
  "Some regional and occasional national travel for competitions.",
];

const offer = [
  "Competitive salary with performance-based incentives.",
  "Visa sponsorship provided for qualified international candidates, including support with the work visa application and relocation process.",
  "The chance to found and shape a brand-new academy — build the curriculum, culture, and competitive program from the ground up rather than inherit someone else's.",
  "Direct support and investment in getting the academy affiliated with USA Cricket and competing regionally/nationally from year one.",
  "A supportive, community-driven environment and the chance to shape the next generation of American cricketers.",
];

// ── JobPosting structured data (Google for Jobs / rich results) ──────────
const jobPostingLd = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Head Cricket Coach",
  description:
    "Founding Head Cricket Coach to build a brand-new youth cricket academy in the Greater Philadelphia area from the ground up — establishing curriculum, recruiting the first cohort, completing USA Cricket affiliation, and entering local and regional competitions from year one.",
  employmentType: "FULL_TIME",
  datePosted: "2026-07-22",
  hiringOrganization: {
    "@type": "Organization",
    name: "Excel Cricket Academy",
    sameAs: "https://extonsports.com",
    logo: "https://extonsports.com/logo.png",
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Philadelphia",
      addressRegion: "PA",
      addressCountry: "US",
    },
  },
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      minValue: 55000,
      maxValue: 70000,
      unitText: "YEAR",
    },
  },
  applicantLocationRequirements: {
    "@type": "Country",
    name: "US",
  },
  directApply: false,
};

export default function HeadCricketCoachPage() {
  return (
    <div className="relative pb-[320px] sm:pb-[200px] md:pb-[90px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd) }}
      />
      <Nav />
      <main className="pt-24 sm:pt-28">
        <article className="mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 pb-20">
          {/* Breadcrumb */}
          <div className="text-mono text-[0.68rem] text-white/40 mb-8">
            <Link
              href="/#careers"
              className="hover:text-[var(--color-ember)] transition-colors"
            >
              ← Careers
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-px bg-[var(--color-ember)]" />
            <span className="text-mono text-[0.7rem] text-[var(--color-ember)]">
              Excel Cricket Academy
            </span>
          </div>
          <h1
            className="text-cond text-white"
            style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)" }}
          >
            Head Cricket Coach
          </h1>

          {/* Meta grid */}
          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 border-t border-b border-[var(--color-line-2)] py-6">
            {meta.map((m) => (
              <div key={m.k} className="contents">
                <dt className="text-mono text-[0.66rem] text-white/40 sm:pt-0.5">
                  {m.k}
                </dt>
                <dd className="text-white/80 text-[0.92rem] leading-[1.5] mb-2 sm:mb-0">
                  {m.v}
                </dd>
              </div>
            ))}
          </dl>

          {/* Apply CTA (top) */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={APPLY_MAILTO}
              className="inline-flex items-center gap-2.5 bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-black text-cond text-[1rem] no-underline transition-colors"
              style={{ padding: "13px 30px", letterSpacing: "0.02em" }}
            >
              Apply now →
            </a>
            <span className="text-white/45 text-[0.82rem]">
              Email{" "}
              <a
                href="mailto:info@extonsports.com"
                className="text-[var(--color-ember)] hover:text-[var(--color-ember-hi)] transition-colors"
              >
                info@extonsports.com
              </a>
            </span>
          </div>

          {/* Body */}
          <Section title="About the Role">
            <p className="mb-4">
              We are launching a new youth cricket academy in the Greater
              Philadelphia area and are seeking a founding Head Cricket Coach to
              build the program from the ground up. This is a rare opportunity to
              establish a brand-new academy&apos;s identity, curriculum, and
              competitive standing rather than step into an existing structure —
              you will be the first technical hire and a defining voice in how the
              program takes shape.
            </p>
            <p className="mb-4">
              You will seed the academy from zero: recruiting the first cohort of
              players, standing up training infrastructure, and getting the academy
              formally plugged into the USA Cricket ecosystem (affiliation,
              registration, and pathway alignment), while also driving enrollment
              and securing entry into local and regional competitions from year one.
            </p>
            <p>
              This is a hands-on, entrepreneurial leadership role for someone who
              loves developing young athletes, is energized by building something
              new rather than maintaining something established, communicates well
              with parents and players, and wants to help grow the game of cricket
              in a fast-expanding U.S. market. High-performance coaching experience
              is a must. Visa sponsorship is available for the right candidate.
            </p>
          </Section>

          <Section title="Key Responsibilities">
            <div className="space-y-8">
              {responsibilities.map((r) => (
                <div key={r.group}>
                  <h3 className="text-cond-md text-[0.9rem] text-[var(--color-ember)] mb-3">
                    {r.group}
                  </h3>
                  <BulletList items={r.items} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Qualifications">
            <h3 className="text-cond-md text-[0.9rem] text-[var(--color-ember)] mb-3">
              Required
            </h3>
            <BulletList items={required} />
            <h3 className="text-cond-md text-[0.9rem] text-[var(--color-ember)] mt-8 mb-3">
              Preferred
            </h3>
            <BulletList items={preferred} />
          </Section>

          <Section title="Schedule & Working Conditions">
            <BulletList items={conditions} />
          </Section>

          <Section title="What We Offer">
            <BulletList items={offer} />
          </Section>

          <Section title="How to Apply">
            <p className="mb-6">
              Please submit a resume, a brief cover letter describing your coaching
              philosophy, and two professional references to{" "}
              <a
                href="mailto:info@extonsports.com"
                className="text-[var(--color-ember)] hover:text-[var(--color-ember-hi)] transition-colors"
              >
                info@extonsports.com
              </a>
              . Applications are reviewed on a rolling basis until the position is
              filled.
            </p>
            <a
              href={APPLY_MAILTO}
              className="inline-flex items-center gap-2.5 bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-black text-cond text-[1rem] no-underline transition-colors"
              style={{ padding: "13px 30px", letterSpacing: "0.02em" }}
            >
              Apply now →
            </a>
          </Section>

          {/* EOE */}
          <p className="mt-14 pt-6 border-t border-[var(--color-line-2)] text-white/45 text-[0.82rem] leading-[1.6]">
            Excel Cricket Academy is an Equal Opportunity Employer. We celebrate
            diversity and are committed to creating an inclusive environment for
            all coaches, players, and staff.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2
        className="text-cond text-white mb-5"
        style={{ fontSize: "clamp(1.7rem, 3vw, 2.2rem)" }}
      >
        {title}
      </h2>
      <div className="text-white/70 text-[0.95rem] leading-[1.75]">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden
            className="mt-[0.6em] h-[5px] w-[5px] shrink-0 bg-[var(--color-ember)]"
          />
          <span className="text-white/70 text-[0.93rem] leading-[1.65]">
            {it}
          </span>
        </li>
      ))}
    </ul>
  );
}
