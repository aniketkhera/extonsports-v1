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
            single job ad. There is no open role now, so it is one line rather
            than a heading, a card and a CTA — and there is no motion wrapper,
            because a footnote that animates itself in has stopped being a
            footnote.

            It keeps the border-t the Careers section used to contribute. About
            ends on a two-column grid with no bottom rule of its own, so without
            this hairline the 3D canvas runs straight into the footer.

            id="careers" survives the section it was named for. Nothing in the
            site links to /#careers any more — the nav and footer entries went
            with the section — but the anchor was live and shared, so inbound
            links land on the sentence that now answers them. scroll-mt-24
            because the nav is fixed at 64px and nothing sets scroll-padding
            globally; the old section hid that inside py-16 md:py-24 and this
            does not (same fix as JobPostingLayout.tsx:189).

            Hover underlines rather than shifting colour. The light-theme remap
            at globals.css:401 matches utilities by NAME, so Tailwind's
            separately-named hover: class never reaches it, and
            --color-ember-hi has no light value at all — so
            hover:text-[var(--color-ember-hi)] would land #FBB28C on white,
            ~1.5:1. The mailto subject is carried over verbatim from the deleted
            block, so anything already filtering on it at info@ keeps working. */}
        <div
          id="careers"
          className="border-t border-[var(--color-line)] px-4 sm:px-6 md:px-12 py-10 scroll-mt-24"
        >
          <p className="mx-auto max-w-[1280px] text-white/45 text-[0.85rem]">
            Interested in coaching? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=General%20coaching%20interest`}
              className="text-[var(--color-ember)] hover:underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            — we&apos;re always looking for coaching talent.
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
