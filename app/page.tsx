import type { Metadata } from "next";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import CtaBanner from "./components/CtaBanner";
import TrustStrip from "./components/TrustStrip";
import Sports from "./components/Sports";
import About from "./components/About";
import Footer from "./components/Footer";

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
