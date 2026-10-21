import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import WorkshopForm from "./WorkshopForm";
import { WORKSHOP, workshopOpen } from "@/lib/fitness-workshop";

/* /fitnessworkshop: sign-ups for the POWER x SeRa Fitness "Health & Fitness
   Workshop" (added 2026-10-21). Aniket: "the link to register, go there, and
   create a form at our end - extonsports.com/fitnessworkshop". The flyer's QR
   and the exit-door TV both point here.

   The two logos are the organisers' own, cropped from their flyer (SeRa has no
   logo file anywhere; the rest of the site sets its name in type). Kept on a
   white tile in both themes, because they were drawn for a light background.

   Rebuilt every five minutes so the form gives way to "closed" soon after 6pm
   on the day; the platform refuses late sign-ups on its own clock regardless. */

export const metadata: Metadata = {
  title: "Health & Fitness Workshop · Fri Oct 30",
  description:
    "POWER and SeRa Fitness present a Bollywood-inspired Health & Fitness Workshop at Exton Sports Center, Friday October 30, 6–8 PM. $10 per person, light refreshments included.",
  alternates: { canonical: "/fitnessworkshop" },
  // Next replaces the layout's openGraph and twitter objects rather than merging them,
  // so the site's image and card type are repeated here (review, 2026-10-21).
  openGraph: {
    title: "Health & Fitness Workshop · Exton Sports Center",
    description: "Friday October 30, 6–8 PM. A Bollywood-inspired workout with POWER and SeRa Fitness. Sign up online.",
    url: WORKSHOP.url,
    siteName: "Exton Sports Center",
    type: "website",
    locale: "en_US",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Exton Sports Center" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Health & Fitness Workshop · Exton Sports Center",
    description: "Friday October 30, 6–8 PM. A Bollywood-inspired workout with POWER and SeRa Fitness. Sign up online.",
  },
};

export const revalidate = 300;

export default function FitnessWorkshopPage() {
  const open = workshopOpen();
  const facts = [
    { k: "When", v: `${WORKSHOP.day} · ${WORKSHOP.time}` },
    { k: "Where", v: `${WORKSHOP.where} (${WORKSHOP.landmark})` },
    { k: "Instructors", v: WORKSHOP.instructors.join(" · ") },
    { k: "Cost", v: `$${WORKSHOP.pricePerPerson} per person, by Zelle to ${WORKSHOP.zelleTo}. Light refreshments included.` },
    { k: "Organiser", v: `${WORKSHOP.organiser}, SeRa Fitness · ${WORKSHOP.zelleTo}` },
  ];

  return (
    <div className="relative pb-[320px] sm:pb-[200px] md:pb-[90px]">
      <Nav />
      <main className="pt-24 sm:pt-28">
        <article className="mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 pb-20">
          <div className="text-mono text-[0.68rem] text-white/40 mb-8">
            <Link href="/" className="hover:text-[var(--color-ember)] transition-colors">
              Exton Sports Center
            </Link>
          </div>

          {/* The presenters, in their own marks. */}
          <div className="flex items-center justify-center gap-5 sm:gap-8 bg-white rounded-sm px-5 py-4 sm:px-8 sm:py-5 border border-[var(--color-line-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small static logo; next/image adds nothing here */}
            <img src="/fitnessworkshop/power-logo.webp" alt="POWER: Professional Women and Women Entrepreneurs Association" width={756} height={339} className="h-[56px] sm:h-[78px] w-auto" />
            <span className="text-mono text-[0.58rem] leading-[1.35] text-center text-[#1a2a3a] shrink-0">
              In
              <br />
              association
              <br />
              with
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element -- a small static logo; next/image adds nothing here */}
            <img src="/fitnessworkshop/sera-logo.webp" alt="SeRa Fitness: Move, Sweat, Shine" width={432} height={441} className="h-[78px] sm:h-[104px] w-auto" />
          </div>

          <div className="mt-10 flex items-center gap-3 mb-4">
            <span className="w-7 h-px bg-[var(--color-ember)]" />
            <span className="text-mono text-[0.7rem] text-[var(--color-ember)]">{WORKSHOP.presenters} present</span>
          </div>
          <h1 className="text-cond text-white" style={{ fontSize: "clamp(2.6rem, 7vw, 4.8rem)" }}>
            Health &amp; Fitness <span className="text-[var(--color-ember)]">Workshop</span>
          </h1>
          <p className="mt-4 text-white/80 text-[1.05rem] leading-[1.6] max-w-[620px]">
            {WORKSHOP.tagline} {WORKSHOP.blurb}
          </p>

          <ul className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WORKSHOP.themes.map((t) => (
              <li key={t.k} className="border border-[var(--color-line-2)] bg-[var(--color-ink)] px-3.5 py-3">
                <div className="text-cond text-[1.15rem] text-[var(--color-ember)]">{t.k}</div>
                <div className="text-white/65 text-[0.8rem] leading-[1.4] mt-1">{t.v}</div>
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 border-t border-b border-[var(--color-line-2)] py-6">
            {facts.map((m) => (
              <div key={m.k} className="contents">
                <dt className="text-mono text-[0.66rem] text-white/40 sm:pt-0.5">{m.k}</dt>
                <dd className="text-white/80 text-[0.95rem] leading-[1.5] mb-2 sm:mb-0">{m.v}</dd>
              </div>
            ))}
          </dl>

          <section id="register" className="mt-12 scroll-mt-28">
            <h2 className="text-cond text-white text-[2rem] mb-2">Sign up</h2>
            {open ? (
              <>
                <ol className="mb-6 space-y-1.5 text-white/75 text-[0.95rem] leading-[1.55]">
                  <li>
                    <span className="text-cond text-[var(--color-ember)] mr-2">1</span>
                    Pay ${WORKSHOP.pricePerPerson} per person by Zelle to{" "}
                    <strong className="text-white">{WORKSHOP.zelleTo}</strong>.
                  </li>
                  <li>
                    <span className="text-cond text-[var(--color-ember)] mr-2">2</span>
                    Fill in the form below with your Zelle confirmation number.
                  </li>
                </ol>
                <WorkshopForm />
              </>
            ) : (
              <div className="border border-[var(--color-line)] bg-[var(--color-ink)] p-6 sm:p-8">
                <div className="text-cond text-[1.5rem] text-white mb-1.5">Sign-ups have closed</div>
                <p className="text-white/65 text-[0.92rem] leading-[1.6]">
                  The workshop has started. For anything about it, call the organiser, {WORKSHOP.organiser}, on{" "}
                  {WORKSHOP.zelleTo}.
                </p>
              </div>
            )}
          </section>

          <p className="mt-10 text-white/50 text-[0.85rem] leading-[1.6]">
            Questions: {WORKSHOP.organiser}, {WORKSHOP.zelleTo} · POWER,{" "}
            <a href={`mailto:${WORKSHOP.power.email}`} className="underline hover:text-[var(--color-ember)]">
              {WORKSHOP.power.email}
            </a>{" "}
            ·{" "}
            <a href={`https://${WORKSHOP.power.site}`} className="underline hover:text-[var(--color-ember)]" rel="noopener" target="_blank">
              {WORKSHOP.power.site}
            </a>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
