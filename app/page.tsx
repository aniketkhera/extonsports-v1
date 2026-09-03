import type { Metadata } from "next";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import CtaBanner from "./components/CtaBanner";
import TrustStrip from "./components/TrustStrip";
import Sports from "./components/Sports";
import About from "./components/About";
import Footer from "./components/Footer";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: {
    absolute:
      "Exton Sports Center — pay-to-play multi-sport club · open 24/7",
  },
  description:
    "Cricket, squash, badminton and indoor turf — under one roof in Exton, PA. Book a court by the hour, no membership required. Open 24/7. Coaching delivered through Orangish.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="relative pb-[320px] sm:pb-[200px] md:pb-[90px]">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <Sports />
        <About />
        {/* All that is left of the careers section, which existed to carry a
            single job ad. There is no open role, so it stays one line — but it
            was reading as small print about small print, so it now borrows the
            club's own "small but real" idiom from the bulk-bookings line in
            Hero.tsx: a mono ember eyebrow, then the sentence, with the address
            set in body colour and underlined in ember rather than being ember
            text itself. Same weight as the line that sells full-venue hire,
            which is about right for the two of them.

            The dot is the nav chip's pulse, reused rather than reinvented — it
            is already how this site says "there is something live here". It is
            bg-[var(--ember-ink)], NOT --color-ember: only the TEXT utility is
            remapped for light (globals.css:401), so a --color-ember background
            would stay pale salmon on white. --ember-ink resolves per theme
            (globals.css:291 dark, :331 light #CE5718) and needs no new CSS.
            motion-reduce drops the pulse and keeps the dot, which is the same
            trade .opening-glow makes at globals.css:192.

            No icon: the eyebrow says "Coaching roles" in words, which signifies
            the thing more plainly than a briefcase glyph would, and costs no
            SVG.

            id="careers" survives the section it was named for. Nothing links to
            /#careers any more — the nav and footer entries went with the
            section — but the anchor was live and shared, so inbound links land
            on the sentence that now answers them. scroll-mt-24 because the nav
            is fixed at 64px and nothing sets scroll-padding globally. */}
        <div
          id="careers"
          className="border-t border-[var(--color-line)] px-4 sm:px-6 md:px-12 py-10 scroll-mt-24"
        >
          <p className="mx-auto max-w-[1280px] flex flex-wrap items-baseline gap-x-[14px] gap-y-2">
            <span className="text-mono text-[0.56rem] text-[var(--color-ember)] inline-flex items-center gap-2 whitespace-nowrap">
              <span className="relative flex h-[6px] w-[6px]">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--ember-ink)] opacity-70 animate-ping motion-reduce:animate-none" />
                <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--ember-ink)]" />
              </span>
              Coaching roles
            </span>
            <span className="text-white/60 text-[0.78rem]">
              Interested in coaching? Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=General%20coaching%20interest`}
                className="text-white border-b border-[var(--color-ember)]/55 hover:border-[var(--color-ember)] transition-colors"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              — we&apos;re always looking for coaching talent.
            </span>
          </p>
        </div>
      </main>
      <Footer />
      {/* CtaBanner is position:fixed — rendered outside main so it
          doesn't leave a gap in the document flow */}
      <CtaBanner />
    </div>
  );
}
