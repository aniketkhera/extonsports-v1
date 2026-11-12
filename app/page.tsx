import type { Metadata } from "next";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import CtaBanner from "./components/CtaBanner";
import TrustStrip from "./components/TrustStrip";
import Sports from "./components/Sports";
import About from "./components/About";
import Footer from "./components/Footer";
import LiveNowBadge from "./components/LiveNowBadge";

export const metadata: Metadata = {
  title: {
    absolute:
      "Exton Sports Center — pay-to-play multi-sport club · open 24/7",
  },
  description:
    "Cricket, squash, badminton, throwball and indoor turf — under one roof in Exton, PA, and the whole cricket hall as a field. Book a court by the hour, no membership required. Open 24/7. Coaching delivered through Orangish.",
  alternates: { canonical: "/" },
};

/* Rebuilt at most hourly (review, 2026-10-14). The page is prerendered, and two
   things on it are chosen by today's club-local date — the PBA timetable
   (lib/pba-schedule.ts, which changes on 2 and 30 November) and rosterIntro on the
   academies row. Without this the HTML only moved on to a new date's copy when the
   site was next deployed, and crawlers and first paint showed the old one. */
export const revalidate = 3600

export default function Home() {
  return (
    <div className="relative pb-[320px] sm:pb-[200px] md:pb-[90px]">
      <Nav />
      {/* LIVE NOW, 2026-11-12. Fixed just under the 64px nav rather than placed INSIDE
          it: the wordmark's font size is computed from a budget of 135px for everything
          else on that row (Nav.tsx explains the arithmetic), so adding an element there
          would push the brand into wrapping on a narrow phone. Fixed also means the badge
          costs the off-air page nothing at all — it renders null, and the document flow
          never knew it was a possibility. */}
      <LiveNowBadge asLink className="fixed left-1/2 top-[74px] z-40 -translate-x-1/2" />
      <main>
        <Hero />
        <TrustStrip />
        <Sports />
        <About />
      </main>
      <Footer />
      {/* CtaBanner is position:fixed — rendered outside main so it
          doesn't leave a gap in the document flow */}
      <CtaBanner />
    </div>
  );
}
