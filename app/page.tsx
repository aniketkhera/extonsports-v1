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
      "Exton Sports Center — Members-only multi-sport club · open 24/7",
  },
  description:
    "Cricket, squash, badminton and indoor turf — under one roof in Exton, PA. Members-only, open 24/7, unlimited court access. Coaching delivered through Orangish.",
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
      </main>
      <Footer />
      {/* CtaBanner is position:fixed — rendered outside main so it
          doesn't leave a gap in the document flow */}
      <CtaBanner />
    </div>
  );
}
