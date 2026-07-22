import Link from "next/link";
import Nav from "./Nav";
import Footer from "./Footer";
import ApplicationForm from "./ApplicationForm";

export type JobPostingData = {
  /** Small ember eyebrow above the title, e.g. "Excel Cricket Academy" */
  academyLabel: string;
  title: string;
  /** Key/value facts shown in the meta grid (Location, Employment type, …) */
  meta: { k: string; v: string }[];
  /** mailto: URL used by every "Apply now" CTA */
  applyMailto: string;
  /** Contact email surfaced next to the apply button + in "How to Apply" */
  applyEmail: string;
  /** "About the Role" paragraphs */
  about: string[];
  /** Grouped responsibility bullets */
  responsibilities: { group: string; items: string[] }[];
  required: string[];
  preferred: string[];
  conditions: string[];
  offer: string[];
  /** Legal entity named in the Equal-Opportunity-Employer line */
  eoeOrg: string;
  /** schema.org JobPosting object rendered as JSON-LD */
  jsonLd: object;
};

export default function JobPostingLayout({ data }: { data: JobPostingData }) {
  return (
    <div className="relative pb-[320px] sm:pb-[200px] md:pb-[90px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd) }}
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
              {data.academyLabel}
            </span>
          </div>
          <h1
            className="text-cond text-white"
            style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)" }}
          >
            {data.title}
          </h1>

          {/* Meta grid */}
          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 border-t border-b border-[var(--color-line-2)] py-6">
            {data.meta.map((m) => (
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

          {/* Apply CTA (top) — jumps to the application form below */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ApplyButton href="#apply" />
            <span className="text-white/45 text-[0.82rem]">
              or email{" "}
              <a
                href={data.applyMailto}
                className="text-[var(--color-ember)] hover:text-[var(--color-ember-hi)] transition-colors"
              >
                {data.applyEmail}
              </a>
            </span>
          </div>

          {/* About */}
          <Section title="About the Role">
            {data.about.map((p, i) => (
              <p key={i} className={i < data.about.length - 1 ? "mb-4" : undefined}>
                {p}
              </p>
            ))}
          </Section>

          {/* Responsibilities */}
          <Section title="Key Responsibilities">
            <div className="space-y-8">
              {data.responsibilities.map((r) => (
                <div key={r.group}>
                  <h3 className="text-cond-md text-[0.9rem] text-[var(--color-ember)] mb-3">
                    {r.group}
                  </h3>
                  <BulletList items={r.items} />
                </div>
              ))}
            </div>
          </Section>

          {/* Qualifications */}
          <Section title="Qualifications">
            <h3 className="text-cond-md text-[0.9rem] text-[var(--color-ember)] mb-3">
              Required
            </h3>
            <BulletList items={data.required} />
            <h3 className="text-cond-md text-[0.9rem] text-[var(--color-ember)] mt-8 mb-3">
              Preferred
            </h3>
            <BulletList items={data.preferred} />
          </Section>

          <Section title="Schedule & Working Conditions">
            <BulletList items={data.conditions} />
          </Section>

          <Section title="What We Offer">
            <BulletList items={data.offer} />
          </Section>

          <Section title="How to Apply" id="apply">
            <p className="mb-6">
              Attach your résumé, add a short cover letter describing your coaching
              philosophy, and tell us how to reach you. Applications are reviewed on
              a rolling basis until the position is filled.
            </p>
            <ApplicationForm role={data.title} />
            <p className="mt-4 text-white/45 text-[0.82rem]">
              Prefer email? Send your résumé and cover letter to{" "}
              <a
                href={data.applyMailto}
                className="text-[var(--color-ember)] hover:text-[var(--color-ember-hi)] transition-colors"
              >
                {data.applyEmail}
              </a>
              .
            </p>
          </Section>

          {/* EOE */}
          <p className="mt-14 pt-6 border-t border-[var(--color-line-2)] text-white/45 text-[0.82rem] leading-[1.6]">
            {data.eoeOrg} is an Equal Opportunity Employer. We celebrate diversity
            and are committed to creating an inclusive environment for all coaches,
            players, and staff.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function ApplyButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2.5 bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-black text-cond text-[1rem] no-underline transition-colors"
      style={{ padding: "13px 30px", letterSpacing: "0.02em" }}
    >
      Apply now →
    </a>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2
        className="text-cond text-white mb-5"
        style={{ fontSize: "clamp(1.7rem, 3vw, 2.2rem)" }}
      >
        {title}
      </h2>
      <div className="text-white/70 text-[0.95rem] leading-[1.75]">{children}</div>
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
          <span className="text-white/70 text-[0.93rem] leading-[1.65]">{it}</span>
        </li>
      ))}
    </ul>
  );
}
